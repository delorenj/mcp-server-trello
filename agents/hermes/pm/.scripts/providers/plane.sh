#!/usr/bin/env sh
# Plane ticket-provider adapter.
#
# Credentials:  PLANE_API_KEY or PLANE_<WORKSPACE>_API_KEY (raw at runtime or
#               an op:// reference resolved immediately before use)
# Endpoint:     PLANE_BASE       (default https://plane.delo.sh)
# Board binding (repo-root .project.json `ticket_provider:`):
#   workspace: <workspace-slug>      (or env PLANE_WORKSPACE)
#   board_id:  <project-uuid>        (set by create_board / 42-ticket-provider)
#   state_map: { in_review: "In Review", completed: "Done",
#                cancelled: "Cancelled" }   optional
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

FLEET_ENV="${HERMES_FLEET_ENV:-$HOME/.hermes/fleet.env}"

die() { echo "plane: $*" >&2; exit 1; }
need_key() { [ -n "${PLANE_API_KEY:-}" ] || die "PLANE_API_KEY is not set"; }

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
API="$BASE/api/v1/workspaces/$WS"

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
api() {
  need_key
  method="$1"; path="$2"; body="${3:-}"
  if [ -n "$body" ]; then
    curl -fsS -X "$method" "$API/$path" \
      -H "X-API-Key: $PLANE_API_KEY" -H "Content-Type: application/json" \
      -H "User-Agent: curl/8.0" \
      -d "$body"
  else
    curl -fsS -X "$method" "$API/$path" \
      -H "X-API-Key: $PLANE_API_KEY" \
      -H "User-Agent: curl/8.0"
  fi
}

# Map a normalized state -> a concrete Plane state id in this project.
resolve_state_id() {
  want="$1"
  [ -n "$PROJ" ] || die "ticket_provider.project not set"
  case "$want" in
    completed) grp=completed; nm="$SM_DONE" ;;
    cancelled) grp=cancelled; nm="$SM_CANCELLED" ;;
    in_review) grp=started;   nm="$SM_IN_REVIEW" ;;
    started)   grp=started;   nm="" ;;
    unstarted) grp=unstarted; nm="" ;;
    backlog)   grp=backlog;   nm="" ;;
    *) die "invalid normalized state: $want" ;;
  esac
  api GET "projects/$PROJ/states/" | GRP="$grp" NM="$nm" python3 -c 'import sys,json,os
d=json.load(sys.stdin); rows=d if isinstance(d,list) else d.get("results", []) if isinstance(d,dict) else []
grp=os.environ["GRP"]; nm=os.environ.get("NM","")
named=[s for s in rows if nm and (s.get("name","").lower()==nm.lower())]
grouped=[s for s in rows if s.get("group")==grp]
pick=(named or grouped or [{}])[0]
print(pick.get("id",""))'
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
    api GET "projects/$PROJ/cycles/" | python3 -c 'import sys,json,datetime
d=json.load(sys.stdin); rows=d if isinstance(d,list) else d.get("results", []) if isinstance(d,dict) else []
now=datetime.datetime.now(datetime.timezone.utc)
def cur(c):
    s,e=c.get("start_date"),c.get("end_date")
    return bool(s and e and s<=now.date().isoformat()<=e)
active=[c for c in rows if cur(c)] or rows
m=active[0] if active else {}
print(json.dumps({"id":m.get("id",""),"name":m.get("name",""),"state":"active" if active else ""}))'
    ;;

  list_issues)
    [ -n "$PROJ" ] || die "project not set"
    # Plane v1 returns issue.state as a bare UUID, so join against the states map.
    STATES="$(api GET "projects/$PROJ/states/")"
    ISSUES="$(api GET "projects/$PROJ/issues/")"
    printf '%s\n%s\n' "$STATES" "$ISSUES" | BASE="$BASE" WS="$WS" PROJ="$PROJ" python3 -c 'import sys,json,os
parts=sys.stdin.read().split("\n",1)
srows=json.loads(parts[0] or "{}"); srows=srows if isinstance(srows,list) else srows.get("results", []) if isinstance(srows,dict) else []
smap={s.get("id"):(s.get("name",""),s.get("group","")) for s in srows}
d=json.loads(parts[1] or "{}"); rows=d if isinstance(d,list) else d.get("results", []) if isinstance(d,dict) else []
base,ws,proj=os.environ["BASE"],os.environ["WS"],os.environ["PROJ"]
out=[]
for n in rows:
    iid=n.get("id","")
    name,group=smap.get(n.get("state",""),("",""))
    out.append({"id":iid,"key":n.get("sequence_id",iid),
                "title":n.get("name",""),"state":name,"state_type":group,
                "updated_at":n.get("updated_at",""),"assignee":"",
                "url":base+"/"+ws+"/projects/"+proj+"/issues/"+str(iid)})
print(json.dumps(out))'
    ;;

  get_issue)
    ID="${1:?usage: get_issue <id>}"
    STATES="$(api GET "projects/$PROJ/states/")"
    ISSUE="$(api GET "projects/$PROJ/issues/$ID/")"
    COMM="$(api GET "projects/$PROJ/issues/$ID/comments/" 2>/dev/null || echo '[]')"
    ATTACH="$(api GET "projects/$PROJ/issues/$ID/issue-attachments/" 2>/dev/null || echo '[]')"
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
      | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))'
    ;;

  transition)
    ID="${1:?usage: transition <id> <normalized-state>}"; TARGET="${2:?}"
    SID="$(resolve_state_id "$TARGET")"
    [ -n "$SID" ] || die "no Plane state for normalized '$TARGET'"
    api PATCH "projects/$PROJ/issues/$ID/" "$(printf '{"state":"%s"}' "$SID")" \
      | python3 -c 'import sys,json; d=json.load(sys.stdin); print("ok "+str(d.get("sequence_id","")) )'
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
    EXIST="$(api GET "projects/?per_page=200" | NAME="$NAME" IDENT="$IDENT" python3 -c 'import sys,json,os
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
      HIT="$(api GET "projects/$PROJ/issues/?per_page=200" | TITLE="$TITLE" python3 -c 'import sys,json,os
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
