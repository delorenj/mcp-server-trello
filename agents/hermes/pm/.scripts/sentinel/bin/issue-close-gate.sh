#!/usr/bin/env sh
# Provider-agnostic close gate. Verifies an issue's evidence file is complete
# before any closure (manual or autonomous). Pure gate: it reports PASS/FAIL on
# stdout/stderr and via the exit code, and publishes nothing.
#
# Usage: issue-close-gate.sh ISSUE_ID [REPO_ROOT]
set -eu

if [ "${1:-}" = "" ]; then
  printf 'Usage: %s ISSUE_ID [REPO_ROOT]\n' "$0" >&2
  exit 2
fi
ISSUE="$1"
case "$ISSUE" in *[!A-Za-z0-9_-]*) printf 'Invalid issue id: %s\n' "$ISSUE" >&2; exit 2 ;; esac

ROOT="${2:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT"

FILE="_bmad-output/implementation-artifacts/issue-evidence/$ISSUE.md"
FAIL=0
check() { grep -q "$1" "$FILE" || { printf 'Missing required evidence: %s\n' "$2" >&2; FAIL=1; }; }

if [ ! -f "$FILE" ]; then
  printf 'Missing issue evidence file: %s\n' "$FILE" >&2
  exit 1
fi

check '^## Issue' 'Issue'
check '^## Acceptance Criteria' 'Acceptance Criteria'
check '^## Repo Changes' 'Repo Changes'
check '^## Verification' 'Verification'
check '^## Ledger Update' 'Ledger Update'
check '^## Known Gaps' 'Known Gaps'
check '^## Close Recommendation' 'Close Recommendation'

if grep -Eiq 'TBD|TODO|not run|pending|unknown' "$FILE"; then
  printf 'Evidence file still contains unresolved placeholders or unverified work.\n' >&2
  FAIL=1
fi
grep -q 'Ledger updated: yes' "$FILE" || { printf 'Ledger update is not marked yes.\n' >&2; FAIL=1; }
grep -q 'Close recommendation: ready' "$FILE" || { printf 'Close recommendation is not ready.\n' >&2; FAIL=1; }

if [ "$FAIL" -ne 0 ]; then
  printf '\nCLOSE GATE: FAIL for %s\n' "$ISSUE" >&2
  exit 1
fi

printf 'CLOSE GATE: PASS for %s\n' "$ISSUE"
