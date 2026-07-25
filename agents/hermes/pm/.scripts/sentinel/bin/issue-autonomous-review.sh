#!/usr/bin/env bash
# Provider-agnostic autonomous adversarial-review decision gate (act, don't wait).
#
# The rigorous, INDEPENDENT ADVERSARIAL review is the normal per-pass path: an
# adversarial microscope that couples the close gate, an independent-reviewer
# drift attestation, and the BloodBank decision event. A clean adversarial
# verdict is acted on AUTONOMOUSLY -- the loop treats the ticket as done and
# moves on; it never parks the ticket waiting on the operator for approval or
# sign-off. Every adversarial check stays at full strength (locked-intent
# baseline, drift none|minor|significant with significant -> hold, any unresolved
# critical/high finding -> hold, independence, and the close gate as a hard
# automated lock). The ONLY thing removed is the human-approval stall.
#
# A default clean run (no --close) means the loop autonomously treats the ticket
# as done and leaves it in the review lane (the operator's deferred-QA queue).
# --close is OPTIONAL (operator QA sweep): closure goes through the
# ticket-provider adapter (tp transition <id> completed), so the same logic works
# on Linear | Plane | Trello.
#
# Protocol: .scripts/sentinel/docs/autonomous-delegated-review.md
#
# Usage: issue-autonomous-review.sh ISSUE_ID REPORT_FILE [--close]
#
# Exit codes: 0 accepted (treat as done; with --close, transitioned to completed)
#             3 held    2 usage/missing inputs
set -euo pipefail

if [[ "${1:-}" == "" || "${2:-}" == "" ]]; then
  printf 'Usage: %s ISSUE_ID REPORT_FILE [--close]\n' "$0" >&2; exit 2
fi
ISSUE="$1"; REPORT="$2"; CLOSE=0
[[ "${3:-}" == "--close" ]] && CLOSE=1
case "$ISSUE" in *[!A-Za-z0-9_-]*) printf 'Invalid issue id: %s\n' "$ISSUE" >&2; exit 2 ;; esac

BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_DIR="$(cd "$BIN_DIR/.." && pwd)"          # .scripts/sentinel
SCRIPTS_DIR="$(cd "$ENGINE_DIR/.." && pwd)"      # .scripts
ROLE_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"
ROLE_YAML="$ROLE_DIR/role.yaml"
ROOT="$(git -C "$ROLE_DIR" rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

EMIT="$BIN_DIR/emit-event.py"
CLOSE_GATE="$BIN_DIR/issue-close-gate.sh"
EVIDENCE="_bmad-output/implementation-artifacts/issue-evidence/$ISSUE.md"

yget() { sed -n "s/^[[:space:]]*$1:[[:space:]]*//p" "$ROLE_YAML" 2>/dev/null | head -n1 | tr -d '"' | tr -d '\r'; }
REPO="$(yget repo)"; REPO="${REPO:-unknown}"
# Informational only: recorded in the decision event/comment, never a blocking
# wait. Default 0 (no grace); an operator may set grace_hours>0 to reintroduce one.
GRACE_HOURS="${RECONCILE_GRACE_HOURS:-$(yget grace_hours)}"; GRACE_HOURS="${GRACE_HOURS:-0}"
AUTO="$(yget auto_review)"; AUTO="${AUTO:-true}"
EVT="bloodbank.v1.repo.$REPO.issue.autonomous_review.decided"

if [[ "${RECONCILE_AUTO_REVIEW:-$AUTO}" == "false" || "${RECONCILE_AUTO_REVIEW:-}" == "off" ]]; then
  printf 'Autonomous review is disabled (reconcile.auto_review=false).\n' >&2; exit 3
fi
[[ -f "$REPORT" ]]   || { printf 'Missing review report file: %s\n' "$REPORT" >&2; exit 2; }
[[ -f "$EVIDENCE" ]] || { printf 'Missing issue evidence file: %s\n' "$EVIDENCE" >&2; exit 2; }

HOLD=""
hold() { HOLD="${HOLD}${HOLD:+; }$1"; }

for s in '^## Reviewer' '^## Locked Intent Baseline' '^## Drift Assessment' '^## Adversarial Findings' '^## Decision'; do
  grep -q "$s" "$REPORT" || hold "report missing section ${s#^## }"
done
grep -qi '^- *Independent of implementer: *yes' "$REPORT" || hold "reviewer did not attest independence"
REVIEWER="$(sed -n 's/^- *Reviewer agent: *//p' "$REPORT" | head -n1 | tr -d '\r')"; REVIEWER="${REVIEWER:-unknown}"
IMPL="$(sed -n 's/^- *\(Worker\|Implemented by\): *//p' "$EVIDENCE" | head -n1 | tr -d '\r')"
[[ -n "$IMPL" && "$IMPL" == "$REVIEWER" ]] && hold "reviewer ($REVIEWER) is the implementer"

DRIFT="$(sed -n 's/^- *Drift assessment: *//p' "$REPORT" | head -n1 | tr -d '\r' | tr 'A-Z' 'a-z' | awk '{print $1}')"
case "$DRIFT" in
  none|minor) : ;;
  significant) hold "significant drift from locked intent" ;;
  *) hold "drift assessment missing/invalid ('${DRIFT:-none-found}')"; DRIFT="${DRIFT:-unknown}" ;;
esac
grep -qi '^- *Critical/high findings: *none' "$REPORT" || hold "unresolved critical/high findings (or line missing)"
# Accept the keyword `accept` as clearing; tolerate the legacy `close`.
DEC="$(sed -n 's/^- *Decision: *//p' "$REPORT" | head -n1 | tr -d '\r' | tr 'A-Z' 'a-z' | awk '{print $1}')"
[[ "$DEC" == "accept" || "$DEC" == "close" ]] || hold "reviewer decision is not 'accept' (got '${DEC:-none}')"

GATE=fail
if sh "$CLOSE_GATE" "$ISSUE" "$ROOT" >/dev/null 2>&1 </dev/null; then GATE=pass; else hold "close gate failed"; fi

if [[ -n "$HOLD" ]]; then DECISION=held; else DECISION=accepted; fi

python3 "$EMIT" "$EVT" --root "$ROOT" \
  --source "repo://sentinel/bin/issue-autonomous-review.sh" --actor-id "$REVIEWER" \
  --field issue="$ISSUE" --field decision="$DECISION" --field drift="$DRIFT" \
  --field close_gate="$GATE" --field reviewer_agent="$REVIEWER" \
  --field evidence_file="$EVIDENCE" --field report_file="$REPORT" \
  --field grace_hours="$GRACE_HOURS" --field hold_reasons="${HOLD:-none}" \
  --quiet </dev/null || printf 'WARN: decision event emission failed; event trail incomplete.\n' >&2

if [[ "$DECISION" == "held" ]]; then
  printf 'AUTONOMOUS REVIEW: HOLD for %s\nReasons: %s\n' "$ISSUE" "$HOLD" >&2
  exit 3
fi

printf 'AUTONOMOUS REVIEW: ACCEPTED - treat as done (no human wait) for %s (reviewer: %s | drift: %s | gate: %s)\n' \
  "$ISSUE" "$REVIEWER" "$DRIFT" "$GATE"

if [[ "$CLOSE" -eq 1 ]]; then
  # Optional operator QA sweep: close through the ticket-provider adapter.
  PROV="$(yget name)"; PROV="${PROV:-}"
  if TICKET_PROVIDER="$PROV" bash -c '. "$1"; tp transition "$2" completed' _ "$SCRIPTS_DIR/lib/ticket-provider.sh" "$ISSUE"; then
    printf 'Ticket %s transitioned to completed via adapter.\n' "$ISSUE"
    TICKET_PROVIDER="$PROV" bash -c '. "$1"; tp comment "$2" "$3"' _ "$SCRIPTS_DIR/lib/ticket-provider.sh" "$ISSUE" \
      "Autonomously accepted by $REVIEWER under the independent adversarial-review protocol (drift: $DRIFT, gate: $GATE, grace ${GRACE_HOURS}h informational). Treated as done; review report: $REPORT." >/dev/null 2>&1 || true
  else
    printf 'Adapter transition failed; decision event recorded, issue left open.\n' >&2
    exit 1
  fi
else
  # Accepted: the loop autonomously treats the ticket as done and leaves it in
  # the review lane (deferred-QA queue). Record the autonomous acceptance via the
  # adapter -- no approval request, no "waiting on the operator".
  PROV="$(yget name)"; PROV="${PROV:-}"
  TICKET_PROVIDER="$PROV" bash -c '. "$1"; tp comment "$2" "$3"' _ "$SCRIPTS_DIR/lib/ticket-provider.sh" "$ISSUE" \
    "Autonomously accepted by $REVIEWER under the independent adversarial-review protocol (drift: $DRIFT, gate: $GATE, grace ${GRACE_HOURS}h informational). Treated as done; stays in the review lane (deferred-QA queue). Review report: $REPORT." >/dev/null 2>&1 || true
  printf 'Accepted: ticket stays in the review lane (deferred-QA queue); the loop moves on.\n'
  printf 'Optional operator QA sweep: re-run with --close to transition %s to completed via the adapter.\n' "$ISSUE"
fi
exit 0
