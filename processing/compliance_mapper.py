# processing/compliance_mapper.py
# Maps findings to OWASP Top 10 2021 categories via CWE identifiers
# and keyword matching for findings without CWE IDs

import json
import os


def load_owasp_mapping():
    """Load CWE to OWASP Top 10 mapping from config"""
    config_path = os.path.join(
        os.path.dirname(__file__), '..', 'config', 'owasp_mapping.json'
    )
    with open(config_path) as f:
        return json.load(f)


def get_owasp_tags_by_cwe(cwe_id, owasp_mapping):
    """Look up OWASP categories for a given CWE ID"""
    if not cwe_id:
        return []

    # Normalise: strip prefix, get number
    cwe_clean = str(cwe_id).upper().replace('CWE-', '').strip()
    key = f"CWE-{cwe_clean}"

    categories = owasp_mapping.get('cwe_mappings', {}).get(key, [])
    return categories


def get_owasp_tags_by_keyword(finding, owasp_mapping):
    """
    Secondary matching via title/description keywords
    for findings that have no CWE identifier
    """
    text = (
        finding.get('title', '') + ' ' +
        finding.get('description', '')
    ).lower()

    matched = []
    for rule in owasp_mapping.get('keyword_rules', []):
        keywords = rule.get('keywords', [])
        if any(kw.lower() in text for kw in keywords):
            category = rule.get('category')
            if category and category not in matched:
                matched.append(category)

    return matched


def map_finding(finding, owasp_mapping):
    """Map a single finding to OWASP Top 10 categories"""
    tags = []

    # Method 1: CWE-based mapping
    cwe_id = finding.get('cwe_id')
    if cwe_id:
        cwe_tags = get_owasp_tags_by_cwe(cwe_id, owasp_mapping)
        tags.extend(cwe_tags)

    # Method 2: Keyword matching (fills gaps)
    if not tags:
        keyword_tags = get_owasp_tags_by_keyword(finding, owasp_mapping)
        tags.extend(keyword_tags)

    # Remove duplicates while preserving order
    seen = set()
    unique_tags = []
    for tag in tags:
        if tag not in seen:
            seen.add(tag)
            unique_tags.append(tag)

    return unique_tags


def run_compliance_mapper(
    input_path="sla-findings.json",
    output_path="final-findings.json"
):
    print("\n" + "=" * 50)
    print("SECUREPIPELINE HUB - COMPLIANCE MAPPER")
    print("=" * 50)

    if not os.path.exists(input_path):
        print(f"[ERROR] Input not found: {input_path}")
        return []

    with open(input_path) as f:
        findings = json.load(f)

    print(f"[INFO] Mapping {len(findings)} findings to OWASP Top 10 2021...")

    owasp_mapping = load_owasp_mapping()
    results = []
    category_counts = {}
    untagged_count = 0

    for finding in findings:
        tags = map_finding(finding, owasp_mapping)
        finding['compliance_tags'] = tags
        results.append(finding)

        if tags:
            for tag in tags:
                category_counts[tag] = category_counts.get(tag, 0) + 1
        else:
            untagged_count += 1

    # Summary
    tagged_count = len(results) - untagged_count
    print(f"\n{'=' * 50}")
    print("COMPLIANCE MAPPING COMPLETE")
    print(f"{'=' * 50}")
    print(f"Total findings: {len(results)}")
    print(f"Tagged with OWASP category: {tagged_count}")
    print(f"No category matched: {untagged_count}")

    print("\nOWASP Top 10 2021 Coverage:")
    all_categories = [
        "A01:2021 - Broken Access Control",
        "A02:2021 - Cryptographic Failures",
        "A03:2021 - Injection",
        "A04:2021 - Insecure Design",
        "A05:2021 - Security Misconfiguration",
        "A06:2021 - Vulnerable and Outdated Components",
        "A07:2021 - Identification and Authentication Failures",
        "A08:2021 - Software and Data Integrity Failures",
        "A09:2021 - Security Logging and Monitoring Failures",
        "A10:2021 - Server-Side Request Forgery",
    ]
    covered = 0
    for cat in all_categories:
        count = category_counts.get(cat, 0)
        status = f"✅ {count} findings" if count > 0 else "—  not covered"
        print(f"  {cat[:35]:35s} {status}")
        if count > 0:
            covered += 1

    print(f"\nCoverage: {covered}/10 OWASP Top 10 categories")

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Output written to: {output_path}")
    print("=" * 50)
    return results


if __name__ == "__main__":
    run_compliance_mapper()