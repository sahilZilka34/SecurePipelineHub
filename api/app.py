# api/app.py
# SecurePipeline Hub - Flask REST API
# Serves enriched findings to the React dashboard

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import sys

# Add project root to path so we can import storage module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from processing.storage import (
    query_findings,
    get_stats,
    get_compliance_status,
    load_all_findings,
    save_findings
)

app = Flask(__name__)
CORS(app)  # Allow React dashboard to call this API


# ─────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────

def success(data, status=200):
    return jsonify({"status": "success", "data": data}), status


def error(message, status=400):
    return jsonify({"status": "error", "message": message}), status


# ─────────────────────────────────────────────
# GET /api/findings
# List all findings with optional filters
# ─────────────────────────────────────────────

@app.route('/api/findings', methods=['GET'])
def get_findings():
    try:
        severity   = request.args.get('severity')
        source     = request.args.get('source')
        priority   = request.args.get('priority')
        assignee   = request.args.get('assignee')
        sla_status = request.args.get('sla_status')
        limit      = int(request.args.get('limit', 100))
        offset     = int(request.args.get('offset', 0))

        findings, total = query_findings(
            severity=severity,
            source=source,
            priority=priority,
            assignee=assignee,
            sla_status=sla_status,
            limit=limit,
            offset=offset
        )

        return success({
            "findings": findings,
            "total": total,
            "limit": limit,
            "offset": offset,
            "returned": len(findings)
        })

    except Exception as e:
        return error(str(e), 500)


# ─────────────────────────────────────────────
# GET /api/findings/<id>
# Single finding by UUID
# ─────────────────────────────────────────────

@app.route('/api/findings/<finding_id>', methods=['GET'])
def get_finding(finding_id):
    try:
        all_findings = load_all_findings()
        finding = next(
            (f for f in all_findings if f.get('id') == finding_id),
            None
        )
        if not finding:
            return error(f"Finding {finding_id} not found", 404)
        return success(finding)

    except Exception as e:
        return error(str(e), 500)


# ─────────────────────────────────────────────
# PATCH /api/findings/<id>
# Mark a finding as resolved
# Body: {"sla_status": "RESOLVED"}
# ─────────────────────────────────────────────

@app.route('/api/findings/<finding_id>', methods=['PATCH'])
def update_finding(finding_id):
    try:
        body = request.get_json()
        if not body:
            return error("Request body required")

        new_status = body.get('sla_status', '').upper()
        valid = ['OPEN', 'WARNING', 'OVERDUE', 'RESOLVED']
        if new_status not in valid:
            return error(f"sla_status must be one of: {valid}")

        # Load all findings, update the matching one, save back
        all_findings = load_all_findings()
        updated = False

        for f in all_findings:
            if f.get('id') == finding_id:
                from datetime import datetime, timezone
                f['sla_status'] = new_status
                if new_status == 'RESOLVED':
                    f['resolved_at'] = datetime.now(timezone.utc).isoformat()
                updated = True
                updated_finding = f
                break

        if not updated:
            return error(f"Finding {finding_id} not found", 404)

        # Persist the update
        from datetime import datetime, timezone
        run_id = f"update_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        save_findings(all_findings, run_id)

        return success(updated_finding)

    except Exception as e:
        return error(str(e), 500)


# ─────────────────────────────────────────────
# GET /api/stats
# Aggregated statistics for dashboard cards
# ─────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    try:
        stats = get_stats()
        return success(stats)
    except Exception as e:
        return error(str(e), 500)


# ─────────────────────────────────────────────
# GET /api/compliance
# OWASP Top 10 coverage status
# ─────────────────────────────────────────────

@app.route('/api/compliance', methods=['GET'])
def get_compliance():
    try:
        compliance = get_compliance_status()
        covered = sum(1 for c in compliance if c['status'] == 'FINDINGS_PRESENT')
        return success({
            "categories": compliance,
            "covered": covered,
            "total": 10,
            "coverage_pct": round((covered / 10) * 100, 1)
        })
    except Exception as e:
        return error(str(e), 500)


# ─────────────────────────────────────────────
# GET /api/trends
# Daily finding counts for last N days
# ─────────────────────────────────────────────

@app.route('/api/trends', methods=['GET'])
def get_trends():
    try:
        days = int(request.args.get('days', 30))
        all_findings = load_all_findings()

        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        daily = {}

        # Initialise all days with zero
        for i in range(days):
            day = (now - timedelta(days=i)).strftime('%Y-%m-%d')
            daily[day] = {"date": day, "total": 0,
                          "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}

        for f in all_findings:
            detected = f.get('detected_at', '')
            if not detected:
                continue
            try:
                dt = datetime.fromisoformat(detected.replace('Z', '+00:00'))
                day = dt.strftime('%Y-%m-%d')
                if day in daily:
                    daily[day]['total'] += 1
                    priority = f.get('priority', 'INFO')
                    if priority in daily[day]:
                        daily[day][priority] += 1
            except Exception:
                continue

        # Return sorted oldest to newest
        trend_list = sorted(daily.values(), key=lambda x: x['date'])
        return success({"trends": trend_list, "days": days})

    except Exception as e:
        return error(str(e), 500)


# ─────────────────────────────────────────────
# GET /api/health
# Health check endpoint
# ─────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    all_findings = load_all_findings()
    return success({
        "status": "healthy",
        "findings_in_storage": len(all_findings),
        "version": "1.0.0"
    })


# ─────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────

@app.route('/', methods=['GET'])
def root():
    return success({
        "name": "SecurePipeline Hub API",
        "version": "1.0.0",
        "endpoints": [
            "GET  /api/health",
            "GET  /api/findings",
            "GET  /api/findings/<id>",
            "PATCH /api/findings/<id>",
            "GET  /api/stats",
            "GET  /api/compliance",
            "GET  /api/trends"
        ]
    })


if __name__ == '__main__':
    print("=" * 50)
    print("SecurePipeline Hub - Flask API")
    print("=" * 50)
    print("Running at: http://localhost:5000")
    print("Endpoints:")
    print("  GET  /api/health")
    print("  GET  /api/findings")
    print("  GET  /api/findings/<id>")
    print("  PATCH /api/findings/<id>")
    print("  GET  /api/stats")
    print("  GET  /api/compliance")
    print("  GET  /api/trends")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)