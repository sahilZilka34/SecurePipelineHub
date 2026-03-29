# processing/sla_engine.py
# Sets time-based remediation deadlines based on risk priority
# and tracks SLA compliance status

import json
import os
from datetime import datetime, timezone, timedelta


def get_timestamp():
    return datetime.now(timezone.utc).isoformat()


def load_sla_config():
    """Load SLA configuration from config/sla_config.json"""
    config_path = os.path.join(
        os.path.dirname(__file__), '..', 'config', 'sla_config.json'
    )
    with open(config_path) as f:
        return json.load(f)


def calculate_sla(finding, sla_config, detected_at=None):
    """
    Calculate SLA deadline and status for a finding.
    Based on priority from risk engine output.
    """
    priority = finding.get('priority', 'INFO')
    tier = sla_config.get('tiers', {}).get(priority, {})

    sla_days = tier.get('sla_days', None)
    escalation_pct = tier.get('escalation_pct', 0.7)
    sentinel_escalate = tier.get('sentinel_escalate', False)

    # Use finding detected_at or now
    if detected_at:
        base_time = datetime.fromisoformat(
            detected_at.replace('Z', '+00:00')
        )
    else:
        base_time = datetime.now(timezone.utc)

    # No deadline for INFO priority
    if sla_days is None:
        return {
            'sla_days': None,
            'due_date': None,
            'escalation_date': None,
            'sla_status': 'NO_SLA',
            'days_remaining': None,
            'resolved_at': None,
            'sentinel_escalate': False
        }

    due_date = base_time + timedelta(days=sla_days)
    escalation_hours = sla_days * 24 * escalation_pct
    escalation_date = base_time + timedelta(hours=escalation_hours)
    now = datetime.now(timezone.utc)

    # Determine current SLA status
    if now > due_date:
        sla_status = 'OVERDUE'
    elif now > escalation_date:
        sla_status = 'WARNING'
    else:
        sla_status = 'OPEN'

    # Calculate days remaining (can be negative if overdue)
    days_remaining = round((due_date - now).total_seconds() / 86400, 1)

    # Also escalate to Sentinel if GitLeaks secret — always urgent
    source = finding.get('source', '')
    if source == 'gitleaks':
        sentinel_escalate = True

    return {
        'sla_days': sla_days,
        'due_date': due_date.isoformat(),
        'escalation_date': escalation_date.isoformat(),
        'sla_status': sla_status,
        'days_remaining': days_remaining,
        'resolved_at': None,
        'sentinel_escalate': sentinel_escalate
    }


def run_sla_engine(
    input_path="owned-findings.json",
    output_path="sla-findings.json"
):
    print("\n" + "=" * 50)
    print("SECUREPIPELINE HUB - SLA ENGINE")
    print("=" * 50)

    if not os.path.exists(input_path):
        print(f"[ERROR] Input not found: {input_path}")
        return []

    with open(input_path) as f:
        findings = json.load(f)

    print(f"[INFO] Processing SLA for {len(findings)} findings...")

    sla_config = load_sla_config()
    results = []
    status_counts = {}
    sentinel_count = 0

    for finding in findings:
        detected_at = finding.get('detected_at')
        sla_data = calculate_sla(finding, sla_config, detected_at)
        finding.update(sla_data)
        results.append(finding)

        status = sla_data['sla_status']
        status_counts[status] = status_counts.get(status, 0) + 1

        if sla_data.get('sentinel_escalate'):
            sentinel_count += 1

    # Summary
    print(f"\n{'=' * 50}")
    print("SLA ASSIGNMENT COMPLETE")
    print(f"{'=' * 50}")
    print(f"Total processed: {len(results)}")
    print("\nBy SLA status:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")

    print(f"\nFindings flagged for Sentinel: {sentinel_count}")

    print("\nSLA breakdown by priority:")
    by_priority = {}
    for f in results:
        p = f.get('priority', 'UNKNOWN')
        by_priority[p] = by_priority.get(p, [])
        by_priority[p].append(f.get('sla_days'))

    for priority in ['HIGH', 'MEDIUM', 'LOW', 'INFO']:
        if priority in by_priority:
            days = by_priority[priority][0]
            count = len(by_priority[priority])
            deadline_str = f"{days} days" if days else "No deadline"
            print(f"  {priority}: {count} findings — deadline: {deadline_str}")

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Output written to: {output_path}")
    print("=" * 50)
    return results


if __name__ == "__main__":
    run_sla_engine()