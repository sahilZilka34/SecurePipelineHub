# processing/risk_engine.py
# Calculates contextual risk score (0-100) for each finding

import json
import os


def load_config():
    """Load risk and asset configuration"""
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'risk_config.json')
    asset_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'asset_config.json')

    with open(config_path) as f:
        risk_config = json.load(f)
    with open(asset_path) as f:
        asset_config = json.load(f)

    return risk_config, asset_config


def get_asset_factors(file_path, asset_config, risk_config):
    """Determine asset criticality and data sensitivity from file path"""
    file_path_lower = str(file_path).lower()

    for rule in asset_config.get('path_rules', []):
        if rule['pattern'].lower() in file_path_lower:
            criticality_key = rule['criticality']
            sensitivity_key = rule['data_sensitivity']
            criticality = risk_config['asset_criticality'].get(criticality_key, 2.0)
            sensitivity = risk_config['data_sensitivity'].get(sensitivity_key, 2.0)
            return criticality, sensitivity, criticality_key, sensitivity_key

    # Defaults
    default_crit = asset_config.get('default_criticality', 'internal_service')
    default_sens = asset_config.get('default_data_sensitivity', 'internal')
    criticality = risk_config['asset_criticality'].get(default_crit, 2.0)
    sensitivity = risk_config['data_sensitivity'].get(default_sens, 2.0)
    return criticality, sensitivity, default_crit, default_sens


def get_exploitability(finding):
    """Determine exploitability factor based on source and severity"""
    source = finding.get('source', '')
    severity = finding.get('severity', 'LOW')
    cve_id = finding.get('cve_id', '')

    # Known CVEs with real exploit potential
    if cve_id and cve_id.startswith('CVE-'):
        return 2.0, 'poc_available'

    # Secrets are always exploitable if found
    if source == 'gitleaks':
        return 3.0, 'known_exploit'

    # Critical/High SAST findings likely have exploits
    if source == 'semgrep' and severity in ['CRITICAL', 'HIGH']:
        return 2.0, 'poc_available'

    # Container vulns with CVE
    if source == 'trivy' and severity in ['CRITICAL', 'HIGH']:
        return 2.0, 'poc_available'

    return 1.0, 'theoretical'


def calculate_risk_score(finding, risk_config, asset_config):
    """
    Risk Score = (Base Severity × Exploitability × Asset Criticality × Data Sensitivity)
                 / Mitigations
    Capped at 100
    """
    # Base severity score
    severity = finding.get('severity', 'LOW')
    base_severity = risk_config['severity_weights'].get(severity, 2)

    # Exploitability
    exploitability, exploit_type = get_exploitability(finding)

    # Asset factors from file path
    file_path = finding.get('file_path', '')
    asset_criticality, data_sensitivity, crit_key, sens_key = get_asset_factors(
        file_path, asset_config, risk_config
    )

    # Mitigations
    mitigation = risk_config['mitigations'].get('none', 1.0)

    # Calculate raw score
    raw_score = (base_severity * exploitability * asset_criticality * data_sensitivity) / mitigation

    # Realistic max: CRITICAL(10) * known_exploit(3.0) * payment(4.0) * credentials(5.0) = 600
    # Typical finding: HIGH(8) * theoretical(1.0) * internal(2.0) * internal(2.0) = 32
    # We want that typical finding to score ~40-50 (MEDIUM range)
    # Scale factor: 100/200 = 0.5 gives good spread
    max_reference = 200
    final_score = min(100, round((raw_score / max_reference) * 100))

    # Determine priority from score
    thresholds = risk_config['priority_thresholds']
    if final_score >= thresholds['CRITICAL']:
        priority = 'CRITICAL'
    elif final_score >= thresholds['HIGH']:
        priority = 'HIGH'
    elif final_score >= thresholds['MEDIUM']:
        priority = 'MEDIUM'
    elif final_score >= thresholds['LOW']:
        priority = 'LOW'
    else:
        priority = 'INFO'

    return {
        'risk_score': final_score,
        'priority': priority,
        'risk_factors': {
            'base_severity': base_severity,
            'exploitability': exploitability,
            'exploit_type': exploit_type,
            'asset_criticality': asset_criticality,
            'asset_criticality_key': crit_key,
            'data_sensitivity': data_sensitivity,
            'data_sensitivity_key': sens_key,
            'mitigations': mitigation,
            'raw_score': round(raw_score, 2)
        }
    }


def run_risk_engine(
    input_path="normalized-findings.json",
    output_path="scored-findings.json"
):
    print("\n" + "="*50)
    print("SECUREPIPELINE HUB - RISK ENGINE")
    print("="*50)

    if not os.path.exists(input_path):
        print(f"[ERROR] Input file not found: {input_path}")
        return []

    with open(input_path) as f:
        findings = json.load(f)

    print(f"[INFO] Processing {len(findings)} findings...")

    risk_config, asset_config = load_config()

    scored = []
    for finding in findings:
        risk_data = calculate_risk_score(finding, risk_config, asset_config)
        finding.update(risk_data)
        scored.append(finding)

    # Sort by risk score descending
    scored.sort(key=lambda x: x['risk_score'], reverse=True)

    # Summary
    by_priority = {}
    for f in scored:
        p = f['priority']
        by_priority[p] = by_priority.get(p, 0) + 1

    print(f"\n{'='*50}")
    print("RISK SCORING COMPLETE")
    print(f"{'='*50}")
    print(f"Total scored: {len(scored)}")
    print("\nBy priority:")
    for p in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']:
        if p in by_priority:
            print(f"  {p}: {by_priority[p]}")

    print("\nTop 5 highest risk findings:")
    for f in scored[:5]:
        print(f"  [{f['risk_score']:3d}] {f['priority']:8s} | "
              f"{f['source']:12s} | {f['title'][:50]}")

    with open(output_path, 'w') as f:
        json.dump(scored, f, indent=2)

    print(f"\n✅ Output written to: {output_path}")
    print("="*50)
    return scored


if __name__ == "__main__":
    run_risk_engine()