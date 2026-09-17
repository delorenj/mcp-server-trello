#!/usr/bin/env sh
# Plane ticket-provider adapter.
#
# Credentials:  PLANE_API_KEY or PLANE_<WORKSPACE>_API_KEY (raw at runtime or
#               an op:// reference resolved immediately before use)
# Endpoint:     PLANE_BASE       (default https://plane.delo.sh)
# Board binding (repo-root .project.json `ticket_provider:`):
#   workspace: <workspace-slug>      (or env PLANE_WORKSPACE)
#   board_id:  <project-uuid>        (set by create_board / 42-ticket-provider)
#   timezone:  <IANA timezone>       optional project calendar override
#   state_map: { started: "In Progress", in_review: "In Review",
#                completed: "Done", cancelled: "Cancelled" }   optional
#
# Rate limiting: reads retry HTTP 429 up to PLANE_READ_MAX_ATTEMPTS (default 4)
# times, sleeping the server's Retry-After capped at PLANE_429_MAX_DELAY
# (default 30s). Mutations are never retried in the transport layer, and
# transition sends at most ONE PATCH: without a version/precondition guard a
# repeated PATCH can stomp a concurrent actor, so the live read-back after the
# single attempt is the only success proof. PLANE_MAX_PAGES bounds every
# paginated collection (default 1000). All numeric overrides are validated
# before any request.
#
# Plane model:  project = board, cycle = milestone, state.group in
#   backlog|unstarted|started|completed|cancelled.
#
# NOTE: REST paths follow Plane's v1 public API. Verify against a live board on
# first use; state/cycle naming varies per workspace.
set -eu

OP="${1:-}"; shift 2>/dev/null || true
ROLE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ROLE_YAML="$ROLE_DIR/role.yaml"
BASE="${PLANE_BASE:-https://plane.delo.sh}"

# Managed/shadow execution owns every mutation; stop before credential fallback.
EXECUTION_MODE="$(python3 - "$ROLE_DIR" <<'PYMODE'
import json, pathlib, sys
for parent in [pathlib.Path(sys.argv[1]), *pathlib.Path(sys.argv[1]).parents]:
    path=parent/'.project.json'
    if path.exists():
        print(json.loads(path.read_text()).get('execution',{}).get('mode','legacy')); break
PYMODE
)"
case "$EXECUTION_MODE" in
  managed|shadow)
    case "$OP" in
      resolve|describe_board|list_issues|list_states|list_labels|active_milestone|get_issue) ;;
      *) echo "plane: $EXECUTION_MODE lifecycle writes require px task through Krebs" >&2; exit 78 ;;
    esac ;;
esac


FLEET_ENV="${HERMES_FLEET_ENV:-$HOME/.hermes/fleet.env}"

die() { echo "plane: $*" >&2; exit 1; }
need_key() { [ -n "${PLANE_API_KEY:-}" ] || die "PLANE_API_KEY is not set"; }

validated_uint() {
  setting="$1"; value="$2"; minimum="$3"; maximum="$4"
  case "$value" in ''|*[!0-9]*) die "$setting must be an integer from $minimum through $maximum" ;; esac
  [ "$value" -ge "$minimum" ] && [ "$value" -le "$maximum" ] \
    || die "$setting must be an integer from $minimum through $maximum"
  printf '%s' "$value"
}

workspace_key() {
  key="$(printf '%s' "${1:-default}" | tr '[:lower:]' '[:upper:]' | sed 's/[^A-Z0-9]/_/g')"
  [ -n "$key" ] || key="DEFAULT"
  printf 'PLANE_%s_API_KEY' "$key"
}

# dotenv_value FILE KEY — read one exact dotenv assignment as inert data.
# Never source the shared fleet file: it may contain unrelated command
# substitutions or credential helpers that this provider must not execute.
dotenv_value() {
  python3 - "$1" "$2" <<'PY'
import pathlib, sys

path = pathlib.Path(sys.argv[1])
key = sys.argv[2]
value = ""
for raw in path.read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    if line.startswith("export "):
        line = line[7:].lstrip()
    name, sep, candidate = line.partition("=")
    if sep and name.strip() == key:
        candidate = candidate.strip()
        if len(candidate) >= 2 and candidate[0] == candidate[-1] and candidate[0] in "'\"":
            candidate = candidate[1:-1]
        value = candidate
        break
print(value, end="")
PY
}

# Resolve an approved secret reference only after selecting the exact provider
# key. The shared dotenv stays inert and the resolved value exists only in this
# provider process.
resolve_secret_value() {
  value="${1:-}"
  case "$value" in
    op://*)
      command -v op >/dev/null 2>&1 || die "1Password CLI is required for the configured Plane credential"
      op read "$value" || die "failed to resolve the configured Plane credential"
      ;;
    *) printf '%s' "$value" ;;
  esac
}

tp_cfg() {
  [ -f "$ROLE_YAML" ] || return 0
  python3 - "$ROLE_YAML" "$1" <<'PY'
import sys, re, pathlib
text = pathlib.Path(sys.argv[1]).read_text()
m = re.search(r'(?ms)^ticket_provider:\s*$(.*?)(?=^\S)', text + "\n\x00")
block = m.group(1) if m else ""
mm = re.search(rf'(?m)^\s*{re.escape(sys.argv[2])}:\s*"?([^"\n]*)"?\s*$', block)
print(mm.group(1).strip() if mm else "")
PY
}

# pj_cfg KEY — read ticket_provider.<KEY> from the repo-root .project.json (the
# SOT), walking up from the role dir. This is preferred over role.yaml so all of
# a repo's agents resolve to the same board.
pj_cfg() {
  python3 - "$ROLE_DIR" "$1" <<'PY'
import sys, json, pathlib
start = pathlib.Path(sys.argv[1]).resolve(); key = sys.argv[2]
for parent in [start, *start.parents]:
    f = parent / ".project.json"
    if f.is_file():
        try: tp = (json.loads(f.read_text()).get("ticket_provider") or {})
        except Exception: tp = {}
        print(tp.get(key, "") if isinstance(tp, dict) else ""); break
else:
    print("")
PY
}

# Board binding: .project.json (SOT) first, then legacy role.yaml, then env.
WS="$(pj_cfg workspace)"; [ -n "$WS" ] || WS="$(tp_cfg workspace)"; WS="${WS:-${PLANE_WORKSPACE:-}}"
PROJ="$(pj_cfg board_id)"; [ -n "$PROJ" ] || PROJ="$(tp_cfg project)"; [ -n "$PROJ" ] || PROJ="$(tp_cfg board_id)"
SM_IN_REVIEW="$(tp_cfg in_review)"; SM_IN_REVIEW="${SM_IN_REVIEW:-In Review}"
SM_DONE="$(tp_cfg completed)"; SM_DONE="${SM_DONE:-Done}"
SM_CANCELLED="$(tp_cfg cancelled)"; SM_CANCELLED="${SM_CANCELLED:-Cancelled}"
SM_STARTED="$(tp_cfg started)"
SM_UNSTARTED="$(tp_cfg unstarted)"
SM_BACKLOG="$(tp_cfg backlog)"
CALENDAR_TZ="$(pj_cfg timezone)"; [ -n "$CALENDAR_TZ" ] || CALENDAR_TZ="$(tp_cfg timezone)"
CALENDAR_TZ="${CALENDAR_TZ:-${TICKET_PROVIDER_TIMEZONE:-${TZ:-}}}"
API="$BASE/api/v1/workspaces/$WS"

READ_MAX_ATTEMPTS="$(validated_uint PLANE_READ_MAX_ATTEMPTS "${PLANE_READ_MAX_ATTEMPTS:-4}" 1 20)"
RETRY_DEFAULT_DELAY="$(validated_uint PLANE_429_RETRY_DELAY "${PLANE_429_RETRY_DELAY:-1}" 0 3600)"
RETRY_MAX_DELAY="$(validated_uint PLANE_429_MAX_DELAY "${PLANE_429_MAX_DELAY:-30}" 0 3600)"
MAX_PAGES="$(validated_uint PLANE_MAX_PAGES "${PLANE_MAX_PAGES:-1000}" 1 1000)"

if [ -z "${PLANE_API_KEY:-}" ]; then
  KEY="$(workspace_key "$WS")"
  PLANE_API_KEY="$(printenv "$KEY" 2>/dev/null || true)"
  if [ -z "${PLANE_API_KEY:-}" ] && [ -f "$FLEET_ENV" ]; then
    PLANE_API_KEY="$(dotenv_value "$FLEET_ENV" "$KEY")"
  fi
fi
PLANE_API_KEY="$(resolve_secret_value "${PLANE_API_KEY:-}")"
export PLANE_API_KEY

# api METHOD PATH [JSON_BODY] — call Plane REST, print response body.
# Reads (GET) are idempotent: on HTTP 429 they retry a bounded number of times,
# sleeping the server's Retry-After (capped, default when absent). Mutations
# are never retried here — a caller must check whether a failed mutation landed
# before repeating it. Any non-2xx outcome dies with the explicit status.
api() {
  need_key
  method="$1"; path="$2"; body="${3:-}"
  max_attempts=1
  case "$method" in GET) max_attempts="$READ_MAX_ATTEMPTS" ;; esac
  api_scratch="$(mktemp -d "${TMPDIR:-/tmp}/plane-api.XXXXXX")" \
    || die "could not create API scratch directory"
  response_file="$api_scratch/response"
  headers_file="$api_scratch/headers"
  cleanup_api_scratch() {
    rm -f "$response_file" "$headers_file"
    rmdir "$api_scratch" 2>/dev/null || true
  }
  trap cleanup_api_scratch 0
  trap 'cleanup_api_scratch; exit 129' HUP
  trap 'cleanup_api_scratch; exit 130' INT
  trap 'cleanup_api_scratch; exit 143' TERM
  attempt=0
  while :; do
    attempt=$((attempt + 1))
    : > "$response_file"
    : > "$headers_file"
    curl_exit=0
    if [ -n "$body" ]; then
      captured="$(curl -sS -o "$response_file" -D "$headers_file" -w '%{http_code}' -X "$method" "$API/$path" \
        -H "X-API-Key: $PLANE_API_KEY" -H "Content-Type: application/json" \
        -H "User-Agent: curl/8.0" \
        -d "$body")" || curl_exit=$?
    else
      captured="$(curl -sS -o "$response_file" -D "$headers_file" -w '%{http_code}' -X "$method" "$API/$path" \
        -H "X-API-Key: $PLANE_API_KEY" \
        -H "User-Agent: curl/8.0")" || curl_exit=$?
    fi
    if [ "$curl_exit" -ne 0 ]; then
      cleanup_api_scratch
      trap - 0 HUP INT TERM
      die "$method $path failed at transport (curl exit $curl_exit)"
    fi
    case "$captured" in
      [1-5][0-9][0-9])
        status="$captured"
        ;;
      *)
        cleanup_api_scratch
        trap - 0 HUP INT TERM
        die "$method $path returned invalid HTTP status ${captured:-empty}"
        ;;
    esac
    output="$(cat "$response_file")"
    if [ "$status" = 429 ] && [ "$attempt" -lt "$max_attempts" ]; then
      delay="$(python3 - "$headers_file" "$RETRY_DEFAULT_DELAY" "$RETRY_MAX_DELAY" <<'PY'
import datetime
import email.utils
import math
import sys

raw = ""
with open(sys.argv[1], encoding="utf-8", errors="replace") as stream:
    for line in stream:
        name, _, value = line.partition(":")
        if name.strip().lower() == "retry-after":
            raw = value.strip()
fallback = int(sys.argv[2])
maximum = int(sys.argv[3])
if raw.isdigit():
    delay = int(raw)
else:
    try:
        target = email.utils.parsedate_to_datetime(raw)
        if target.tzinfo is None:
            target = target.replace(tzinfo=datetime.timezone.utc)
        delay = max(
            0,
            math.ceil(
                (target - datetime.datetime.now(datetime.timezone.utc)).total_seconds()
            ),
        )
    except (TypeError, ValueError, OverflowError):
        delay = fallback
print(min(delay, maximum))
PY
)"
      sleep "$delay"
      continue
    fi
    case "$status" in
      2*)
        printf '%s' "$output"
        cleanup_api_scratch
        trap - 0 HUP INT TERM
        return 0
        ;;
    esac
    detail="$(printf '%s' "$output" | head -c 300 | tr '\n' ' ')"
    cleanup_api_scratch
    trap - 0 HUP INT TERM
    die "$method $path failed (HTTP $status)${detail:+: $detail}"
  done
}

# api_all PATH — GET every page of a Plane list endpoint and print one merged
# JSON array. Plane v1 paginates with a next_cursor query token and a
# next_page_results flag; bare-list and single-page responses pass through.
api_all() {
  path="$1"
  page_scratch="$(mktemp -d "${TMPDIR:-/tmp}/plane-pages.XXXXXX")" \
    || die "could not create pagination scratch directory"
  pages_file="$page_scratch/pages"
  cursors_file="$page_scratch/cursors"
  : > "$pages_file"
  : > "$cursors_file"
  cleanup_page_scratch() {
    rm -f "$pages_file" "$cursors_file"
    rmdir "$page_scratch" 2>/dev/null || true
  }
  trap cleanup_page_scratch 0
  trap 'cleanup_page_scratch; exit 129' HUP
  trap 'cleanup_page_scratch; exit 130' INT
  trap 'cleanup_page_scratch; exit 143' TERM
  cursor=""
  page_count=0
  while :; do
    page_count=$((page_count + 1))
    [ "$page_count" -le "$MAX_PAGES" ] \
      || die "pagination for $path exceeded PLANE_MAX_PAGES=$MAX_PAGES"
    case "$path" in *\?*) sep="&" ;; *) sep="?" ;; esac
    if [ -n "$cursor" ]; then
      encoded_cursor="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$cursor")"
      page_path="$path${sep}cursor=$encoded_cursor"
    else
      page_path="$path"
    fi
    if ! page="$(api GET "$page_path")"; then
      cleanup_page_scratch
      trap - 0 HUP INT TERM
      return 1
    fi
    printf '%s\0' "$page" >> "$pages_file"
    page_meta="$(printf '%s' "$page" | python3 -c 'import sys,json
d=json.load(sys.stdin)
if isinstance(d,list):
    print("done")
elif isinstance(d,dict):
    more=d.get("next_page_results", False)
    if more is True:
        cursor=str(d.get("next_cursor") or "")
        if not cursor:
            raise SystemExit("plane: pagination reported another page without a cursor")
        print("next\t"+cursor)
    else:
        print("done")
else:
    raise SystemExit("plane: paginated endpoint returned neither an object nor a list")')"
    case "$page_meta" in
      done) break ;;
      next*) next="${page_meta#*	}" ;;
      *) die "invalid pagination metadata for $path" ;;
    esac
    cursor_fingerprint="$(python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest())' "$next")"
    if grep -Fqx "$cursor_fingerprint" "$cursors_file"; then
      die "pagination cursor for $path repeated"
    fi
    printf '%s\n' "$cursor_fingerprint" >> "$cursors_file"
    cursor="$next"
  done
  python3 - "$pages_file" <<'PY'
import json
import pathlib
import sys

rows = []
for chunk in pathlib.Path(sys.argv[1]).read_bytes().split(b"\0"):
    if not chunk:
        continue
    d = json.loads(chunk)
    if isinstance(d, list):
        rows.extend(d)
    elif isinstance(d, dict):
        rows.extend(d.get("results") or [])
print(json.dumps(rows))
PY
  cleanup_page_scratch
  trap - 0 HUP INT TERM
}

# Select the one date-current cycle. An empty result is explicit and must never
# fall back to the first historical cycle returned by Plane.
current_cycle() {
  CALENDAR_TZ="$CALENDAR_TZ" TICKET_PROVIDER_NOW="${TICKET_PROVIDER_NOW:-}" python3 -c 'import sys,json,datetime,os
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
d=json.load(sys.stdin); rows=d if isinstance(d,list) else d.get("results", []) if isinstance(d,dict) else []
tz_name=os.environ.get("CALENDAR_TZ", "").strip()
try:
    calendar_tz=ZoneInfo(tz_name) if tz_name else (datetime.datetime.now().astimezone().tzinfo or datetime.timezone.utc)
except (ZoneInfoNotFoundError, ValueError):
    raise SystemExit(f"plane: invalid project timezone {tz_name!r}")
clock=os.environ.get("TICKET_PROVIDER_NOW", "").strip()
if clock:
    try: now=datetime.datetime.fromisoformat(clock.replace("Z", "+00:00"))
    except ValueError: raise SystemExit(f"plane: invalid TICKET_PROVIDER_NOW {clock!r}")
    if now.tzinfo is None: raise SystemExit("plane: TICKET_PROVIDER_NOW must include a UTC offset")
else:
    now=datetime.datetime.now(datetime.timezone.utc)
today=now.astimezone(calendar_tz).date()
def boundary(value):
    try: return datetime.date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError): return None
def current(c):
    start,end=boundary(c.get("start_date")),boundary(c.get("end_date"))
    return bool(start and end and start <= today <= end)
active=sorted((c for c in rows if current(c)), key=lambda c:(str(c.get("start_date") or ""),str(c.get("id") or "")), reverse=True)
m=active[0] if active else {}
print(json.dumps({"id":m.get("id", ""),"name":m.get("name", ""),"state":"active" if m else "inactive"}))'
}

# Map a normalized state -> exactly one concrete Plane state id. A configured
# name must exist in the expected group; it never falls back to another state in
# the same group. An unnamed group is safe only when the group has one member.
resolve_state_id() {
  want="$1"
  [ -n "$PROJ" ] || die "ticket_provider.project not set"
  case "$want" in
    awaiting_decision|needs_attention) grp=started; nm="Needs Attention" ;;
    completed) grp=completed; nm="$SM_DONE" ;;
    cancelled) grp=cancelled; nm="$SM_CANCELLED" ;;
    in_review) grp=started;   nm="$SM_IN_REVIEW" ;;
    started)   grp=started;   nm="$SM_STARTED" ;;
    unstarted) grp=unstarted; nm="$SM_UNSTARTED" ;;
    backlog)   grp=backlog;   nm="$SM_BACKLOG" ;;
    *) die "invalid normalized state: $want" ;;
  esac
  api_all "projects/$PROJ/states/" | GRP="$grp" NM="$nm" WANT="$want" python3 -c 'import sys,json,os
d=json.load(sys.stdin); rows=d if isinstance(d,list) else d.get("results", []) if isinstance(d,dict) else []
grp=os.environ["GRP"]; nm=os.environ.get("NM","").strip(); want=os.environ["WANT"]
grouped=[s for s in rows if s.get("group")==grp]
if nm:
    candidates=[s for s in grouped if str(s.get("name","")).strip().casefold()==nm.casefold()]
    if len(candidates) != 1:
        raise SystemExit(f"plane: exact Plane state {nm!r} for normalized {want!r} was not resolved uniquely in group {grp!r}")
else:
    candidates=grouped
    if len(candidates) != 1:
        names=", ".join(str(s.get("name") or "") for s in candidates) or "none"
        raise SystemExit(f"plane: normalized state {want!r} is ambiguous in group {grp!r} ({names}); configure ticket_provider.{want}")
state_id=str(candidates[0].get("id") or "")
if not state_id:
    raise SystemExit(f"plane: resolved Plane state for normalized {want!r} has no id")
print(state_id)'
}

# All Plane ops except the explicit-workspace read below require the bound
# workspace API key; fail fast and clean before any pipe.
case "$OP" in describe_board) ;; *) need_key ;; esac

case "$OP" in
  resolve)
    [ -n "$WS" ] || die "workspace not set (.project.json ticket_provider.workspace or PLANE_WORKSPACE)"
    [ -n "$PROJ" ] || die "project not set (.project.json ticket_provider.board_id; run 42-ticket-provider.sh)"
    PROJECT_DETAIL="$(api GET "projects/$PROJ/")"
    LIVE_IDENTIFIER="$(printf '%s' "$PROJECT_DETAIL" | python3 -c 'import sys,json
try: print(str(json.load(sys.stdin).get("identifier") or ""))
except Exception: print("")')"
    [ -n "$LIVE_IDENTIFIER" ] || die "live Plane project omitted its authoritative identifier"
    printf '{"provider":"plane","board_id":"%s","board_url":"%s/%s/projects/%s/issues/","identifier":"%s"}\n' \
      "$PROJ" "$BASE" "$WS" "$PROJ" "$LIVE_IDENTIFIER"
    ;;

  active_milestone)
    [ -n "$PROJ" ] || die "project not set"
    api_all "projects/$PROJ/cycles/" | current_cycle
    ;;

  list_issues)
    [ -n "$PROJ" ] || die "project not set"
    # Plane v1 returns issue.state as a bare UUID, so join against the states map.
    STATES="$(api_all "projects/$PROJ/states/")"
    ISSUES="$(api_all "projects/$PROJ/issues/")"
    MILESTONE="$(api_all "projects/$PROJ/cycles/" | current_cycle)"
    MILESTONE_ID="$(printf '%s' "$MILESTONE" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id", ""))')"
    MILESTONE_ISSUES='[]'
    if [ -n "$MILESTONE_ID" ]; then
      MILESTONE_ISSUES="$(api_all "projects/$PROJ/cycles/$MILESTONE_ID/cycle-issues/")"
    fi
    printf '%s\0%s\0%s\0%s' "$STATES" "$ISSUES" "$MILESTONE" "$MILESTONE_ISSUES" \
      | BASE="$BASE" WS="$WS" PROJ="$PROJ" python3 -c 'import sys,json,os
parts=sys.stdin.buffer.read().split(b"\0",3)
srows=json.loads(parts[0] or "{}"); srows=srows if isinstance(srows,list) else srows.get("results", []) if isinstance(srows,dict) else []
smap={s.get("id"):(s.get("name",""),s.get("group","")) for s in srows}
d=json.loads(parts[1] or "{}"); rows=d if isinstance(d,list) else d.get("results", []) if isinstance(d,dict) else []
milestone=json.loads(parts[2] or "{}"); milestone_id=str(milestone.get("id") or ""); milestone_name=str(milestone.get("name") or "")
md=json.loads(parts[3] or "{}"); mrows=md if isinstance(md,list) else md.get("results", []) if isinstance(md,dict) else []
member_ids={str(issue.get("id") or "") for issue in mrows}
base,ws,proj=os.environ["BASE"],os.environ["WS"],os.environ["PROJ"]
out=[]
for n in rows:
    iid=n.get("id","")
    name,group=smap.get(n.get("state",""),("",""))
    out.append({"id":iid,"key":n.get("sequence_id",iid),
                "title":n.get("name",""),"state":name,"state_type":group,
                "updated_at":n.get("updated_at",""),"assignee":"",
                "active_milestone_id":milestone_id,
                "active_milestone_name":milestone_name,
                "in_active_milestone":bool(milestone_id and str(iid) in member_ids),
                "url":base+"/"+ws+"/projects/"+proj+"/issues/"+str(iid)})
print(json.dumps(out))'
    ;;

  get_issue)
    ID="${1:?usage: get_issue <id>}"
    STATES="$(api_all "projects/$PROJ/states/")"
    ISSUE="$(api GET "projects/$PROJ/issues/$ID/")"
    COMM="$(api_all "projects/$PROJ/issues/$ID/comments/" 2>/dev/null || echo '[]')"
    ATTACH="$(api_all "projects/$PROJ/issues/$ID/issue-attachments/" 2>/dev/null || echo '[]')"
    printf '%s\n%s\n%s\n%s\n' "$STATES" "$ISSUE" "$COMM" "$ATTACH" | python3 -c 'import sys,json,re
parts=sys.stdin.read().split("\n",3)
srows=json.loads(parts[0] or "{}"); srows=srows if isinstance(srows,list) else srows.get("results", []) if isinstance(srows,dict) else []
smap={s.get("id"):(s.get("name",""),s.get("group","")) for s in srows}
i=json.loads(parts[1] or "{}"); c=json.loads(parts[2] or "[]"); a=json.loads(parts[3] or "[]")
rows=c if isinstance(c,list) else c.get("results", []) if isinstance(c,dict) else []
arows=a if isinstance(a,list) else a.get("results", []) if isinstance(a,dict) else []
def strip(h): return re.sub(r"<[^>]+>","",h or "").strip()
name,group=smap.get(i.get("state",""),("",""))
desc=strip(i.get("description_html",""))
cs=[{"id":x.get("id",""),"body":strip(x.get("comment_html","")),"author":""} for x in rows]
ats=[]
for x in arows:
    attrs=x.get("attributes") or {}
    ats.append({"id":x.get("id",""),"name":attrs.get("name",x.get("name","")),
                "type":attrs.get("type",x.get("type","")),
                "size":attrs.get("size",x.get("size",0)),"asset":x.get("asset",""),
                "url":x.get("asset_url",x.get("url","")),
                "created_at":x.get("created_at",""),"updated_at":x.get("updated_at",""),
                "is_uploaded":x.get("is_uploaded",False)})
print(json.dumps({"id":i.get("id",""),"key":i.get("sequence_id",""),"title":i.get("name",""),
                  "description":desc,"acceptance":desc,
                  "state":name,"state_type":group,"comments":cs,"attachments":ats}))'
    ;;

  comment)
    ID="${1:?usage: comment <id> <body>}"; BODY="${2:?}"
    api POST "projects/$PROJ/issues/$ID/comments/" \
      "$(python3 -c 'import json,sys; print(json.dumps({"comment_html":"<p>"+sys.argv[1]+"</p>"}))' "$BODY")" \
      | EXPECTED_ID="$ID" python3 -c 'import sys,json,os
comment=json.load(sys.stdin)
if not isinstance(comment,dict):
    raise SystemExit("plane: comment response was not an object")
comment_id=comment.get("id")
if not isinstance(comment_id,str) or not comment_id.strip():
    raise SystemExit("plane: comment response omitted its comment id")
for key in ("issue", "issue_id"):
    if key not in comment:
        continue
    linked=comment[key]
    linked_id=linked.get("id") if isinstance(linked,dict) else linked
    if not isinstance(linked_id,str) or linked_id.strip()!=os.environ["EXPECTED_ID"]:
        raise SystemExit("plane: comment response identified a different issue")
print(comment_id.strip())'
    ;;

  transition)
    ID="${1:?usage: transition <id> <normalized-state>}"; TARGET="${2:?}"
    SID="$(resolve_state_id "$TARGET")"
    # Without a version or precondition guard, a repeated PATCH can stomp a
    # concurrent actor, so exactly one PATCH mutation attempt is ever sent.
    # The live read-back after that attempt is the only success proof: an exact
    # same-issue match on the intended state id yields `ok`. A 2xx PATCH whose
    # read-back disagrees is reported as concurrent divergence; an ambiguous
    # (transport-level or non-2xx) PATCH may still be confirmed landed by an
    # exact read-back. Any other read-back outcome fails without a second PATCH.
    # Subshell: a transport-level die inside api must not kill this op.
    if ( api PATCH "projects/$PROJ/issues/$ID/" "$(printf '{"state":"%s"}' "$SID")" ) >/dev/null; then
      PATCH_2XX=1
    else
      PATCH_2XX=0
    fi
    if ! READBACK="$(api GET "projects/$PROJ/issues/$ID/")"; then
      die "transition read-back failed after the single PATCH attempt; refusing to repeat the PATCH"
    fi
    if ! READBACK_RESULT="$(printf '%s' "$READBACK" | EXPECTED_ID="$ID" EXPECTED_SID="$SID" python3 -c 'import sys,json,os
try:
    d=json.load(sys.stdin)
except (TypeError, ValueError) as exc:
    raise SystemExit(f"plane: transition read-back was not valid JSON: {exc}")
if not isinstance(d,dict) or str(d.get("id") or "") != os.environ["EXPECTED_ID"]:
    raise SystemExit("plane: transition read-back did not identify the requested issue")
state=d.get("state", "")
actual=str(state.get("id") or "") if isinstance(state,dict) else str(state or "")
if not actual:
    raise SystemExit("plane: transition read-back omitted its state id")
if actual == os.environ["EXPECTED_SID"]:
    sequence=str(d.get("sequence_id") or "")
    if not sequence:
        raise SystemExit("plane: transition read-back omitted its sequence id")
    print("match\t"+sequence)
else:
    print("mismatch\t"+actual)')"; then
      die "transition read-back could not be verified after the single PATCH attempt; refusing to repeat the PATCH"
    fi
    case "$READBACK_RESULT" in
      match*)
        printf 'ok %s\n' "${READBACK_RESULT#*	}"
        ;;
      mismatch*)
        ACTUAL="${READBACK_RESULT#*	}"
        if [ "$PATCH_2XX" -eq 1 ]; then
          die "transition read-back state $ACTUAL did not match intended state id $SID after a 2xx PATCH response; concurrent divergence suspected; refusing to claim the transition completed"
        fi
        die "transition PATCH outcome was ambiguous and the read-back state $ACTUAL did not match intended state id $SID; refusing to claim the transition completed"
        ;;
      *)
        die "transition read-back returned an invalid verification outcome; refusing to repeat the PATCH"
        ;;
    esac
    ;;

  describe_board)
    # Read-only board lookup against an EXPLICIT workspace argument, so the
    # .project.json / role.yaml / env workspace precedence can never silently
    # query the wrong workspace. Emits Plane's own identifier, never a guess.
    DWS="${1:?usage: describe_board <workspace> <board_id>}"
    DBID="${2:?usage: describe_board <workspace> <board_id>}"
    DKEYVAR="$(workspace_key "$DWS")"
    DKEY="$(printenv "$DKEYVAR" 2>/dev/null || true)"
    if [ -z "$DKEY" ] && [ -f "$FLEET_ENV" ]; then
      DKEY="$(dotenv_value "$FLEET_ENV" "$DKEYVAR")"
    fi
    [ -n "$DKEY" ] || DKEY="${PLANE_API_KEY:-}"
    DKEY="$(resolve_secret_value "$DKEY")"
    [ -n "$DKEY" ] || die "no Plane API key for workspace '$DWS' (looked for $DKEYVAR)"
    DETAIL="$(curl -fsS "$BASE/api/v1/workspaces/$DWS/projects/$DBID/" \
      -H "X-API-Key: $DKEY" -H "User-Agent: curl/8.0")" \
      || die "describe_board failed for $DWS/$DBID"
    printf '%s' "$DETAIL" | WS="$DWS" BID="$DBID" python3 -c 'import sys, json, os
d = json.load(sys.stdin)
ident = str(d.get("identifier") or "")
if not ident:
    raise SystemExit("plane: live Plane project omitted its authoritative identifier")
print(json.dumps({
    "board_id": str(d.get("id") or os.environ["BID"]),
    "identifier": ident,
    "workspace": os.environ["WS"],
    "name": str(d.get("name") or ""),
}))'
    ;;

  create_board)
    NAME="${1:?usage: create_board <name> <ident> <desc>}"; IDENT="${2:-}"; DESC="${3:-}"
    [ -n "$WS" ] || die "workspace not set"
    EXIST="$(api_all "projects/?per_page=200" | NAME="$NAME" IDENT="$IDENT" python3 -c 'import sys,json,os
d=json.load(sys.stdin); rows=d if isinstance(d,list) else d.get("results", []) if isinstance(d,dict) else []
name=os.environ["NAME"].strip().lower(); ident=os.environ["IDENT"].upper()
# Repo NAME is the primary key — links an existing repo board even if its
# identifier differs (Plane does not enforce unique names, so this prevents
# duplicate boards). Fall back to identifier match; empty -> create new.
pid=next((p["id"] for p in rows if str(p.get("name","")).strip().lower()==name), "")
if not pid and ident:
    pid=next((p["id"] for p in rows if (p.get("identifier") or "").upper()==ident), "")
print(pid)')"
    LIVE_IDENTIFIER=""
    if [ -n "$EXIST" ]; then PID="$EXIST"; else
      CREATED="$(api POST "projects/" \
        "$(python3 -c 'import json,sys; print(json.dumps({"name":sys.argv[1],"identifier":sys.argv[2],"description":sys.argv[3]}))' "$NAME" "$IDENT" "$DESC")")"
      PID="$(printf '%s' "$CREATED" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))')"
      LIVE_IDENTIFIER="$(printf '%s' "$CREATED" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("identifier","") or "")')"
    fi
    [ -n "$PID" ] || die "create_board failed"
    if [ -z "$LIVE_IDENTIFIER" ]; then
      DETAIL="$(api GET "projects/$PID/")"
      LIVE_IDENTIFIER="$(printf '%s' "$DETAIL" | python3 -c 'import sys,json
try: print(str(json.load(sys.stdin).get("identifier") or ""))
except Exception: print("")')"
    fi
    [ -n "$LIVE_IDENTIFIER" ] || die "live Plane project omitted its authoritative identifier"
    printf '{"board_id":"%s","board_url":"%s/%s/projects/%s/issues/","identifier":"%s"}\n' \
      "$PID" "$BASE" "$WS" "$PID" "$LIVE_IDENTIFIER"
    ;;

  create_issue)
    # File a new ticket on the bound board. Board/workspace come from resolved
    # config, never from an argument. Deliberately NOT idempotent by default:
    # two issues may legitimately share a title. Pass --if-absent to reuse an
    # issue whose title already matches exactly (case-insensitive) instead.
    IF_ABSENT=0
    case "${1:-}" in --if-absent) IF_ABSENT=1; shift ;; esac
    TITLE="${1:?usage: create_issue [--if-absent] <title> [description]}"; DESC="${2:-}"
    [ -n "$WS" ] || die "workspace not set (.project.json ticket_provider.workspace or PLANE_WORKSPACE)"
    [ -n "$PROJ" ] || die "project not set (.project.json ticket_provider.board_id; run 42-ticket-provider.sh)"
    IID=""; SEQ=""; CREATED=true
    if [ "$IF_ABSENT" = 1 ]; then
      HIT="$(api_all "projects/$PROJ/issues/?per_page=200" | TITLE="$TITLE" python3 -c 'import sys,json,os
d=json.load(sys.stdin); rows=d if isinstance(d,list) else d.get("results", []) if isinstance(d,dict) else []
want=os.environ["TITLE"].strip().lower()
m=next((i for i in rows if (i.get("name") or "").strip().lower()==want), None)
print((str(m.get("id","")) + " " + str(m.get("sequence_id","") or "")) if m else "")')"
      if [ -n "$HIT" ]; then IID="${HIT%% *}"; SEQ="${HIT#* }"; CREATED=false; fi
    fi
    if [ -z "$IID" ]; then
      NEW="$(api POST "projects/$PROJ/issues/" \
        "$(python3 -c 'import html,json,sys
body={"name": sys.argv[1]}
desc=sys.argv[2]
if desc: body["description_html"]="<p>"+html.escape(desc)+"</p>"
print(json.dumps(body))' "$TITLE" "$DESC")" \
        | python3 -c 'import sys,json
d=json.load(sys.stdin)
print(str(d.get("id","")) + " " + str(d.get("sequence_id","") or ""))')"
      IID="${NEW%% *}"; SEQ="${NEW#* }"
    fi
    [ -n "$IID" ] || die "create_issue failed"
    printf '{"issue_id":"%s","key":"%s","issue_url":"%s/%s/projects/%s/issues/%s","created":%s}\n' \
      "$IID" "$SEQ" "$BASE" "$WS" "$PROJ" "$IID" "$CREATED"
    ;;

  *) die "unknown op: $OP" ;;
esac
