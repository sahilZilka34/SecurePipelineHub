# processing/ownership_engine.py
# Assigns findings to code owners using CODEOWNERS file and git blame

import json
import os
import subprocess
import fnmatch
from datetime import datetime, timezone


def get_timestamp():
    return datetime.now(timezone.utc).isoformat()


def parse_codeowners(codeowners_path="CODEOWNERS"):
    """
    Parse CODEOWNERS file into list of (pattern, owner) tuples
    Returns list in order — first match wins
    """
    rules = []

    if not os.path.exists(codeowners_path):
        print(f"[WARN] CODEOWNERS not found at {codeowners_path}")
        return rules

    with open(codeowners_path) as f:
        for line in f:
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            parts = line.split()
            if len(parts) >= 2:
                pattern = parts[0]
                owner = parts[1]
                rules.append((pattern, owner))

    print(f"[INFO] CODEOWNERS: loaded {len(rules)} rules")
    return rules


def match_codeowners(file_path, rules):
    """
    Match a file path against CODEOWNERS rules
    Returns (owner, pattern) or None
    Last matching rule wins (GitHub behaviour)
    """
    if not file_path or file_path == 'unknown':
        return None, None

    matched_owner = None
    matched_pattern = None

    # Normalize path separators
    file_path_normalized = file_path.replace('\\', '/')

    for pattern, owner in rules:
        # Remove leading slash for matching
        clean_pattern = pattern.lstrip('/')

        # Direct match
        if fnmatch.fnmatch(file_path_normalized, clean_pattern):
            matched_owner = owner
            matched_pattern = pattern
            continue

        # Check if pattern matches end of path
        if fnmatch.fnmatch(os.path.basename(file_path_normalized), clean_pattern):
            matched_owner = owner
            matched_pattern = pattern
            continue

        # Check directory prefix match
        if file_path_normalized.startswith(clean_pattern.rstrip('*')):
            matched_owner = owner
            matched_pattern = pattern
            continue

        # Wildcard extension match (e.g. *.py)
        if clean_pattern.startswith('*') and file_path_normalized.endswith(clean_pattern[1:]):
            matched_owner = owner
            matched_pattern = pattern
            continue

    return matched_owner, matched_pattern


def git_blame_owner(file_path, line_number):
    """
    Run git blame on a file/line to find who last modified it
    Returns author email or None
    """
    if not file_path or file_path == 'unknown' or line_number == 0:
        return None

    # Skip non-file paths (URLs, Docker targets etc.)
    if file_path.startswith('http') or file_path.startswith('Docker:'):
        return None

    try:
        result = subprocess.run(
            ['git', 'blame', '-L', f'{line_number},{line_number}',
             '--porcelain', file_path],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if line.startswith('author-mail'):
                    email = line.replace('author-mail', '').strip()
                    email = email.strip('<>').strip()
                    if email and email != 'not.committed.yet':
                        return email
    except Exception as e:
        pass  # Git blame fails gracefully

    return None


def assign_owner(finding, codeowners_rules):
    """
    Assign owner to a finding using:
    1. CODEOWNERS file match
    2. Git blame
    3. Source-based default
    4. Global default
    """
    file_path = finding.get('file_path', 'unknown')
    line_number = finding.get('line_number', 0)
    source = finding.get('source', '')

    # Method 1: CODEOWNERS
    owner, pattern = match_codeowners(file_path, codeowners_rules)
    if owner:
        return {
            'assignee': owner,
            'assignee_team': owner.split('@')[0] if '@' in owner else owner,
            'assigned_at': get_timestamp(),
            'assignment_method': 'codeowners',
            'codeowners_pattern': pattern
        }

    # Method 2: Git blame
    git_owner = git_blame_owner(file_path, line_number)
    if git_owner:
        return {
            'assignee': git_owner,
            'assignee_team': git_owner.split('@')[0],
            'assigned_at': get_timestamp(),
            'assignment_method': 'gitblame',
            'codeowners_pattern': None
        }

    # Method 3: Source-based defaults
    source_defaults = {
        'semgrep':            'backend-team@securepipeline.dev',
        'gitleaks':           'security-team@securepipeline.dev',
        'dependency-check':   'devops-team@securepipeline.dev',
        'trivy':              'devops-team@securepipeline.dev',
        'zap':                'security-team@securepipeline.dev'
    }

    if source in source_defaults:
        return {
            'assignee': source_defaults[source],
            'assignee_team': source_defaults[source].split('@')[0],
            'assigned_at': get_timestamp(),
            'assignment_method': 'default',
            'codeowners_pattern': None
        }

    # Method 4: Global fallback
    return {
        'assignee': 'sahil@securepipeline.dev',
        'assignee_team': 'unassigned',
        'assigned_at': get_timestamp(),
        'assignment_method': 'default',
        'codeowners_pattern': None
    }


def run_ownership_engine(
    input_path="scored-findings.json",
    output_path="owned-findings.json",
    codeowners_path="CODEOWNERS"
):
    print("\n" + "="*50)
    print("SECUREPIPELINE HUB - OWNERSHIP ENGINE")
    print("="*50)

    if not os.path.exists(input_path):
        print(f"[ERROR] Input not found: {input_path}")
        return []

    with open(input_path) as f:
        findings = json.load(f)

    print(f"[INFO] Assigning owners to {len(findings)} findings...")

    codeowners_rules = parse_codeowners(codeowners_path)

    owned = []
    method_counts = {}

    for finding in findings:
        ownership = assign_owner(finding, codeowners_rules)
        finding.update(ownership)
        owned.append(finding)

        method = ownership['assignment_method']
        method_counts[method] = method_counts.get(method, 0) + 1

    # Summary
    print(f"\n{'='*50}")
    print("OWNERSHIP ASSIGNMENT COMPLETE")
    print(f"{'='*50}")
    print(f"Total assigned: {len(owned)}")
    print("\nBy method:")
    for method, count in method_counts.items():
        print(f"  {method}: {count}")

    # Show assignee breakdown
    assignees = {}
    for f in owned:
        a = f.get('assignee', 'unknown')
        assignees[a] = assignees.get(a, 0) + 1

    print("\nBy assignee:")
    for assignee, count in sorted(assignees.items(), key=lambda x: -x[1]):
        print(f"  {assignee}: {count} findings")

    print("\nSample assignments (top 5 by risk):")
    for f in owned[:5]:
        print(f"  [{f.get('risk_score',0):3d}] {f.get('assignee','?'):35s} "
              f"| {f.get('assignment_method','?'):12s} "
              f"| {f.get('title','')[:40]}")

    with open(output_path, 'w') as f:
        json.dump(owned, f, indent=2)

    print(f"\n✅ Output written to: {output_path}")
    print("="*50)
    return owned


if __name__ == "__main__":
    run_ownership_engine()