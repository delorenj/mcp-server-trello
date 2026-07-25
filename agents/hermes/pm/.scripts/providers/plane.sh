#!/usr/bin/env sh
# Plane ticket-provider adapter.
#
# Credentials:  PLANE_API_KEY   (X-API-Key header)
# Endpoint:     PLANE_BASE       (default https://plane.delo.sh)
# Board binding (role.yaml `ticket_provider:`):
#   name: plane
#   workspace: <workspace-slug>      (or env PLANE_WORKSPACE)
#   project:   <project-uuid>        (set by create_board / 42-ticket-provider)
#   state_map: { in_review: "In Review", completed: "Done" }   optional
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

die() { echo "plane: $*" >&2; exit 1; }
need_key() { [ -n "${PLANE_API_KEY:-}" ] || die "PLANE_API_KEY is not set"; }

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

# Board binding: .project.json (SOT) first, then role.yaml, then env.
WS="$(pj_cfg workspace)"; [ -n "$WS" ] || WS="$(tp_cfg workspace)"; WS="${WS:-${PLANE_WORKSPACE:-}}"
PROJ="$(pj_cfg board_id)"; [ -n "$PROJ" ] || PROJ="$(tp_cfg project)"
SM_IN_REVIEW="$(tp_cfg in_review)"; SM_IN_REVIEW="${SM_IN_REVIEW:-In Review}"
SM_DONE="$(tp_cfg completed)"; SM_DONE="${SM_DONE:-Done}"
API="$BASE/api/v1/workspaces/$WS"

# api METHOD PATH [JSON_BODY] — call Plane REST, print response body.
api() {
  need_key
  method="$1"; path="$2"; body="${3:-}"
  if [ -n "$body" ]; then
    curl -fsS -X "$method" "$API/$path" \
      -H "X-API-Key: $PLANE_API_KEY" -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -fsS -X "$method" "$API/$path" -H "X-API-Key: $PLANE_API_KEY"
  fi
}

# Map a normalized state -> a concrete Plane state id in this project.
resolve_state_id() {
  want="$1"
  [ -n "$PROJ" ] || die "ticket_provider.project not set"
  case "$want" in
    completed) grp=completed; nm="$SM_DONE" ;;
    in_review) grp=started;   nm="$SM_IN_REVIEW" ;;
    started)   grp=started;   nm="" ;;
    unstarted) grp=unstarted; nm="" ;;
    backlog)   grp=backlog;   nm="" ;;
    *) die "invalid normalized state: $want" ;;
  esac
  api GET "projects/$PROJ/states/" | GRP="$grp" NM="$nm" python3 -c 'import sys,json,os
d=json.load(sys.stdin); rows=d.get("results", d if isinstance(d,list) else [])
grp=os.environ["GRP"]; nm=os.environ.get("NM","")
named=[s for s in rows if nm and (s.get("name","").lower()==nm.lower())]
grouped=[s for s in rows if s.get("group")==grp]
pick=(named or grouped or [{}])[0]
print(pick.get("id",""))'
}

# All Plane ops require the API key; fail fast and clean before any pipe.
need_key

case "$OP" in
  resolve)
    [ -n "$WS" ] || die "workspace not set (role.yaml ticket_provider.workspace or PLANE_WORKSPACE)"
    [ -n "$PROJ" ] || die "project not set (run 42-ticket-provider.sh)"
    printf '{"provider":"plane","board_id":"%s","board_url":"%s/%s/projects/%s/issues/"}\n' \
      "$PROJ" "$BASE" "$WS" "$PROJ"
    ;;

  active_milestone)
    [ -n "$PROJ" ] || die "project not set"
    api GET "projects/$PROJ/cycles/" | python3 -c 'import sys,json,datetime
d=json.load(sys.stdin); rows=d.get("results", d if isinstance(d,list) else [])
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
srows=json.loads(parts[0] or "{}"); srows=srows.get("results", srows if isinstance(srows,list) else [])
smap={s.get("id"):(s.get("name",""),s.get("group","")) for s in srows}
d=json.loads(parts[1] or "{}"); rows=d.get("results", d if isinstance(d,list) else [])
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
    printf '%s\n%s\n%s\n' "$STATES" "$ISSUE" "$COMM" | python3 -c 'import sys,json,re
parts=sys.stdin.read().split("\n",2)
srows=json.loads(parts[0] or "{}"); srows=srows.get("results", srows if isinstance(srows,list) else [])
smap={s.get("id"):(s.get("name",""),s.get("group","")) for s in srows}
i=json.loads(parts[1] or "{}"); c=json.loads(parts[2] or "[]")
rows=c.get("results", c if isinstance(c,list) else [])
def strip(h): return re.sub(r"<[^>]+>","",h or "").strip()
name,group=smap.get(i.get("state",""),("",""))
desc=strip(i.get("description_html",""))
cs=[{"id":x.get("id",""),"body":strip(x.get("comment_html","")),"author":""} for x in rows]
print(json.dumps({"id":i.get("id",""),"key":i.get("sequence_id",""),"title":i.get("name",""),
                  "description":desc,"acceptance":desc,
                  "state":name,"state_type":group,"comments":cs}))'
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

  create_board)
    NAME="${1:?usage: create_board <name> <ident> <desc>}"; IDENT="${2:-}"; DESC="${3:-}"
    [ -n "$WS" ] || die "workspace not set"
    EXIST="$(api GET "projects/?per_page=200" | IDENT="$IDENT" python3 -c 'import sys,json,os
d=json.load(sys.stdin); rows=d.get("results", d if isinstance(d,list) else [])
ident=os.environ["IDENT"].upper()
print(next((p["id"] for p in rows if (p.get("identifier") or "").upper()==ident), ""))')"
    if [ -n "$EXIST" ]; then PID="$EXIST"; else
      PID="$(api POST "projects/" \
        "$(python3 -c 'import json,sys; print(json.dumps({"name":sys.argv[1],"identifier":sys.argv[2],"description":sys.argv[3]}))' "$NAME" "$IDENT" "$DESC")" \
        | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))')"
    fi
    [ -n "$PID" ] || die "create_board failed"
    printf '{"board_id":"%s","board_url":"%s/%s/projects/%s/issues/"}\n' "$PID" "$BASE" "$WS" "$PID"
    ;;

  *) die "unknown op: $OP" ;;
esac
