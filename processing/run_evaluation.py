# processing/run_evaluation.py
# Runs the full processing chain on evaluation target results
# Run: python processing/run_evaluation.py

import json
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from processing.normalizer import (
    parse_semgrep, parse_gitleaks, parse_trivy, make_finding
)
from processing.risk_engine import run_risk_engine
from processing.ownership_engine import run_ownership_engine
from processing.sla_engine import run_sla_engine
from processing.compliance_mapper import run_compliance_mapper
from processing.storage import save_findings


def run_evaluation_target(target_name, semgrep_path, gitleaks_path, trivy_path):
    """
    Run full processing chain for one evaluation target.
    target_name: 'juice-shop' or 'dvwa'
    """
    print(f"\n{'='*50}")
    print(f"Processing: {target_name.upper()}")
    print(f"{'='*50}")

    findings = []

    # Parse each scanner output
    if os.path.exists(semgrep_path):
        sg = parse_semgrep(semgrep_path)
        print(f"[INFO] Semgrep: {len(sg)} findings")
        findings.extend(sg)
    else:
        print(f"[WARN] Semgrep file not found: {semgrep_path}")

    if os.path.exists(gitleaks_path):
        gl = parse_gitleaks(gitleaks_path)
        print(f"[INFO] GitLeaks: {len(gl)} findings")
        findings.extend(gl)
    else:
        print(f"[WARN] GitLeaks file not found: {gitleaks_path}")

    if os.path.exists(trivy_path):
        tv = parse_trivy(trivy_path)
        print(f"[INFO] Trivy: {len(tv)} findings")
        findings.extend(tv)
    else:
        print(f"[WARN] Trivy file not found: {trivy_path}")

    if not findings:
        print(f"[ERROR] No findings for {target_name}")
        return

    print(f"[INFO] Total raw findings: {len(findings)}")

    # Tag all findings with target app name in pipeline_run_id
    for f in findings:
        f['pipeline_run_id'] = target_name
        f['target_app'] = target_name

    # Write to temp file for processing chain
    temp_normalized = f"eval_{target_name}_normalized.json"
    temp_scored = f"eval_{target_name}_scored.json"
    temp_owned = f"eval_{target_name}_owned.json"
    temp_sla = f"eval_{target_name}_sla.json"
    temp_final = f"eval_{target_name}_final.json"

    with open(temp_normalized, 'w') as f:
        json.dump(findings, f, indent=2)

    # Run processing chain
    run_risk_engine(temp_normalized, temp_scored)
    run_ownership_engine(temp_scored, temp_owned)
    run_sla_engine(temp_owned, temp_sla)
    run_compliance_mapper(temp_sla, temp_final)

    # Save to storage
    with open(temp_final) as f:
        final_findings = json.load(f)

    filepath = save_findings(final_findings, pipeline_run_id=target_name)
    print(f"\n✅ {target_name}: {len(final_findings)} findings saved to {filepath}")

    # Clean up temp files
    for temp in [temp_normalized, temp_scored, temp_owned, temp_sla, temp_final]:
        if os.path.exists(temp):
            os.remove(temp)

    return len(final_findings)


if __name__ == "__main__":
    print("\n" + "="*50)
    print("SECUREPIPELINE HUB - EVALUATION RUNNER")
    print("="*50)

    # Paths to evaluation scanner outputs
    # Put the downloaded files in evaluation/ folder
    base = "evaluation"

    targets = [
        {
            "name": "juice-shop",
            "semgrep":  f"{base}/juiceshop-semgrep.json",
            "gitleaks": f"{base}/juiceshop-gitleaks.json",
            "trivy":    f"{base}/juiceshop-trivy.json",
        },
        {
            "name": "dvwa",
            "semgrep":  f"{base}/dvwa-semgrep.json",
            "gitleaks": f"{base}/dvwa-gitleaks.json",
            "trivy":    f"{base}/dvwa-trivy.json",
        }
    ]

    total = 0
    for t in targets:
        count = run_evaluation_target(
            t["name"],
            t["semgrep"],
            t["gitleaks"],
            t["trivy"]
        )
        if count:
            total += count

    print(f"\n{'='*50}")
    print(f"EVALUATION COMPLETE")
    print(f"{'='*50}")
    print(f"Total findings processed: {total}")
    print(f"Dashboard now shows all findings including evaluation targets")
    print(f"Restart the Flask API and refresh the dashboard")
    print("="*50)