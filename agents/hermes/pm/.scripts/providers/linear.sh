#!/usr/bin/env sh
# Linear ticket-provider adapter (reference implementation).
#
# Credentials:  LINEAR_API_KEY
# Board binding (role.yaml `ticket_provider:`):
#   name: linear
#   team:    <TEAM_KEY>          e.g. DEL
#   project: "<Project name>"    optional; scopes milestone/issue queries
#   state_map: { in_review: "In Review", completed: "Done",
#                cancelled: "Canceled" }   optional overrides
#
# Implements the contract in lib/ticket-provider.sh. All Linear access goes
# through GraphQL so the same envelope works in unattended runs.
# LINEAR_MAX_PAGES bounds issue pagination (default 1000).
# GraphQL variable references are intentionally single-quoted shell literals.
# shellcheck disable=SC2016
set -eu

OP="${1:-}"; shift 2>/dev/null || true
ROLE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ROLE_YAML="$ROLE_DIR/role.yaml"
GRAPHQL_URL="${LINEAR_GRAPHQL_URL:-https://api.linear.app/graphql}"

die() { echo "linear: $*" >&2; exit 1; }
need_key() { [ -n "${LINEAR_API_KEY:-}" ] || die "LINEAR_API_KEY is not set"; }

validated_uint() {
  setting="$1"; value="$2"; minimum="$3"; maximum="$4"
  case "$value" in ''|*[!0-9]*) die "$setting must be an integer from $minimum through $maximum" ;; esac
  [ "$value" -ge "$minimum" ] && [ "$value" -le "$maximum" ] \
    || die "$setting must be an integer from $minimum through $maximum"
  printf '%s' "$value"
}

# tp_cfg KEY — read ticket_provider.<KEY> from role.yaml (best-effort, flat).
tp_cfg() {
  [ -f "$ROLE_YAML" ] || return 0
  python3 - "$ROLE_YAML" "$1" <<'PY'
import sys, re, pathlib
text = pathlib.Path(sys.argv[1]).read_text()
m = re.search(r'(?ms)^ticket_provider:\s*$(.*?)(?=^\S)', text + "\n\x00")
block = m.group(1) if m else ""
key = sys.argv[2]
mm = re.search(rf'(?m)^\s*{re.escape(key)}:\s*"?([^"\n]*)"?\s*$', block)
print(mm.group(1).strip() if mm else "")
PY
}

# pj_cfg KEY — read ticket_provider.<KEY> from the repo-root .project.json (the
# SOT), walking up from the role dir. Preferred over role.yaml.
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

# gql QUERY [VARS_JSON] — POST a GraphQL request, print data JSON, fail on errors.
gql() {
  need_key
  _vars="${2:-}"; [ -n "$_vars" ] || _vars='{}'
  python3 - "$1" "$_vars" "$GRAPHQL_URL" <<'PY'
import json, os, sys, urllib.request, urllib.error
q, variables = sys.argv[1], json.loads(sys.argv[2])
req = urllib.request.Request(
    sys.argv[3],
    data=json.dumps({"query": q, "variables": variables}).encode(),
    headers={"Authorization": os.environ["LINEAR_API_KEY"],
             "Content-Type": "application/json"},
    method="POST")
try:
    body = json.loads(urllib.request.urlopen(req, timeout=30).read())
except urllib.error.HTTPError as e:
    body = json.loads(e.read() or "{}")
except urllib.error.URLError as e:
    print(f"linear request failed: {e}", file=sys.stderr); sys.exit(1)
if body.get("errors"):
    print(json.dumps(body["errors"]), file=sys.stderr); sys.exit(1)
print(json.dumps(body.get("data") or {}))
PY
}

TEAM="$(pj_cfg team)"; [ -n "$TEAM" ] || TEAM="$(tp_cfg team)"
PROJECT="$(pj_cfg project)"; [ -n "$PROJECT" ] || PROJECT="$(tp_cfg project)"
SM_IN_REVIEW="$(tp_cfg in_review)"; SM_IN_REVIEW="${SM_IN_REVIEW:-In Review}"
SM_DONE="$(tp_cfg completed)"; SM_DONE="${SM_DONE:-Done}"
SM_CANCELLED="$(tp_cfg cancelled)"; SM_CANCELLED="${SM_CANCELLED:-Canceled}"
SM_STARTED="$(tp_cfg started)"
SM_UNSTARTED="$(tp_cfg unstarted)"
SM_BACKLOG="$(tp_cfg backlog)"
MAX_PAGES="$(validated_uint LINEAR_MAX_PAGES "${LINEAR_MAX_PAGES:-1000}" 1 1000)"

# All Linear ops require the API key; fail fast and clean before any pipe.
need_key

case "$OP" in
  resolve)
    [ -n "$TEAM" ] || die "ticket_provider.team (Linear team key) not set in role.yaml"
    gql 'query($k:String!){ teams(filter:{key:{eq:$k}}){nodes{id key name}} }' \
        "$(printf '{"k":"%s"}' "$TEAM")" \
      | python3 -c 'import sys,json; d=json.load(sys.stdin); t=(d.get("teams",{}).get("nodes") or [{}])[0]; print(json.dumps({"provider":"linear","board_id":t.get("id",""),"board_url":"https://linear.app/team/"+t.get("key",""),"identifier":t.get("key","")}))'
    ;;

  active_milestone)
    # Linear project milestones; pick the first non-completed milestone in the project.
    gql 'query($p:String){ projects(filter:{name:{eq:$p}}){nodes{ id name projectMilestones{nodes{id name targetDate}} state }} }' \
        "$(printf '{"p":"%s"}' "$PROJECT")" \
      | python3 -c 'import sys,json
d=json.load(sys.stdin); ps=d.get("projects",{}).get("nodes") or []
p=ps[0] if ps else {}
ms=(p.get("projectMilestones",{}) or {}).get("nodes") or []
m=ms[0] if ms else {"id":p.get("id",""),"name":p.get("name","")}
print(json.dumps({"id":m.get("id",""),"name":m.get("name",""),"state":p.get("state","")}))'
    ;;

  list_issues)
    [ -n "$TEAM" ] || die "ticket_provider.team not set"
    ISSUE_PAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/linear-issues.XXXXXX")" || die "could not create pagination scratch directory"
    ISSUE_PAGE_ROWS="$ISSUE_PAGE_DIR/rows"
    ISSUE_PAGE_CURSORS="$ISSUE_PAGE_DIR/cursors"
    : > "$ISSUE_PAGE_ROWS"
    : > "$ISSUE_PAGE_CURSORS"
    cleanup_issue_pages() {
      rm -f "$ISSUE_PAGE_ROWS" "$ISSUE_PAGE_CURSORS"
      rmdir "$ISSUE_PAGE_DIR" 2>/dev/null || true
    }
    trap cleanup_issue_pages 0
    trap 'cleanup_issue_pages; exit 129' HUP
    trap 'cleanup_issue_pages; exit 130' INT
    trap 'cleanup_issue_pages; exit 143' TERM
    AFTER=""
    PAGE_COUNT=0
    while :; do
      PAGE_COUNT=$((PAGE_COUNT + 1))
      [ "$PAGE_COUNT" -le "$MAX_PAGES" ] \
        || die "pagination exceeded LINEAR_MAX_PAGES=$MAX_PAGES"
      VARS="$(python3 -c 'import json,sys; print(json.dumps({"k":sys.argv[1],"after":sys.argv[2] or None}))' "$TEAM" "$AFTER")"
      PAGE="$(gql 'query($k:String!,$after:String){ issues(first:100, after:$after, filter:{team:{key:{eq:$k}}}){nodes{ id identifier title updatedAt url state{name type} assignee{name} } pageInfo{hasNextPage endCursor}} }' "$VARS")"
      printf '%s' "$PAGE" | python3 -c 'import sys,json
d=json.load(sys.stdin)
for n in (d.get("issues") or {}).get("nodes") or []:
    st=n.get("state") or {}
    print(json.dumps({"id":n["id"],"key":n.get("identifier",""),"title":n.get("title",""),
                      "state":st.get("name",""),"state_type":st.get("type",""),
                      "updated_at":n.get("updatedAt",""),
                      "assignee":(n.get("assignee") or {}).get("name",""),"url":n.get("url","")}))' \
        >> "$ISSUE_PAGE_ROWS"
      HAS_NEXT="$(printf '%s' "$PAGE" | python3 -c 'import sys,json; print("true" if ((json.load(sys.stdin).get("issues") or {}).get("pageInfo") or {}).get("hasNextPage") else "false")')"
      [ "$HAS_NEXT" = "true" ] || break
      NEXT="$(printf '%s' "$PAGE" | python3 -c 'import sys,json; print(str(((json.load(sys.stdin).get("issues") or {}).get("pageInfo") or {}).get("endCursor") or ""))')"
      [ -n "$NEXT" ] || die "Linear pagination reported another page without an end cursor"
      CURSOR_FINGERPRINT="$(python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest())' "$NEXT")"
      if grep -Fqx "$CURSOR_FINGERPRINT" "$ISSUE_PAGE_CURSORS"; then
        die "Linear pagination cursor repeated"
      fi
      printf '%s\n' "$CURSOR_FINGERPRINT" >> "$ISSUE_PAGE_CURSORS"
      AFTER="$NEXT"
    done
    python3 - "$ISSUE_PAGE_ROWS" <<'PY'
import json
import pathlib
import sys

rows = [json.loads(line) for line in pathlib.Path(sys.argv[1]).read_text().splitlines() if line]
print(json.dumps(rows))
PY
    cleanup_issue_pages
    trap - 0 HUP INT TERM
    ;;

  get_issue)
    ID="${1:?usage: get_issue <id>}"
    gql 'query($id:String!){ issue(id:$id){ id identifier title description state{name type} comments{nodes{id body user{name}}} } }' \
        "$(printf '{"id":"%s"}' "$ID")" \
      | python3 -c 'import sys,json
d=json.load(sys.stdin); i=d.get("issue") or {}
st=i.get("state") or {}
cs=[{"id":c["id"],"body":c.get("body",""),"author":(c.get("user") or {}).get("name","")} for c in (i.get("comments",{}) or {}).get("nodes") or []]
print(json.dumps({"id":i.get("id",""),"key":i.get("identifier",""),"title":i.get("title",""),
                  "description":i.get("description",""),"acceptance":i.get("description",""),
                  "state":st.get("name",""),"state_type":st.get("type",""),"comments":cs}))'
    ;;

  comment)
    ID="${1:?usage: comment <id> <body>}"; BODY="${2:?usage: comment <id> <body>}"
    gql 'mutation($id:String!,$b:String!){ commentCreate(input:{issueId:$id,body:$b}){ comment{id issue{id}} success } }' \
        "$(python3 -c 'import json,sys; print(json.dumps({"id":sys.argv[1],"b":sys.argv[2]}))' "$ID" "$BODY")" \
      | EXPECTED_ID="$ID" python3 -c 'import sys,json,os
document=json.load(sys.stdin)
created=document.get("commentCreate") if isinstance(document,dict) else None
if not isinstance(created,dict) or created.get("success") is not True:
    raise SystemExit("linear: commentCreate did not report success")
comment=created.get("comment")
if not isinstance(comment,dict):
    raise SystemExit("linear: commentCreate response omitted its comment object")
comment_id=comment.get("id")
if not isinstance(comment_id,str) or not comment_id.strip():
    raise SystemExit("linear: commentCreate response omitted its comment id")
issue=comment.get("issue")
if not isinstance(issue,dict) or str(issue.get("id") or "").strip()!=os.environ["EXPECTED_ID"]:
    raise SystemExit("linear: commentCreate response did not identify the requested issue")
print(comment_id.strip())'
    ;;

  transition)
    ID="${1:?usage: transition <id> <normalized-state>}"; TARGET="${2:?}"
    # Map normalized -> a concrete Linear state name, then resolve its id on the team.
    case "$TARGET" in
      completed)  WANT_TYPE=completed; WANT_NAME="$SM_DONE" ;;
      cancelled)  WANT_TYPE=canceled;  WANT_NAME="$SM_CANCELLED" ;;
      in_review)  WANT_TYPE=started;   WANT_NAME="$SM_IN_REVIEW" ;;
      started)    WANT_TYPE=started;   WANT_NAME="$SM_STARTED" ;;
      unstarted)  WANT_TYPE=unstarted; WANT_NAME="$SM_UNSTARTED" ;;
      backlog)    WANT_TYPE=backlog;   WANT_NAME="$SM_BACKLOG" ;;
      *) die "invalid normalized state: $TARGET" ;;
    esac
    STATE_ID="$(gql 'query($id:String!){ issue(id:$id){ team{ states{nodes{id name type}} } } }' \
        "$(printf '{"id":"%s"}' "$ID")" \
      | WANT_TYPE="$WANT_TYPE" WANT_NAME="$WANT_NAME" python3 -c 'import sys,json,os
d=json.load(sys.stdin)
states=((d.get("issue") or {}).get("team") or {}).get("states",{}).get("nodes") or []
want_t=os.environ["WANT_TYPE"]; want_n=os.environ.get("WANT_NAME","")
if want_n:
    candidates=[s for s in states if str(s.get("name") or "").strip().casefold()==want_n.strip().casefold()]
    basis=f"configured name {want_n!r}"
else:
    candidates=[s for s in states if s.get("type")==want_t]
    basis=f"workflow type {want_t!r}"
if len(candidates) != 1:
    raise SystemExit(f"linear: {basis} resolved {len(candidates)} states; exactly one is required")
pick=candidates[0]
if pick.get("type") != want_t:
    raise SystemExit(f"linear: configured state {want_n!r} has type {pick.get('type')!r}, expected {want_t!r}")
state_id=str(pick.get("id") or "")
if not state_id:
    raise SystemExit("linear: resolved state omitted its id")
print(state_id)')"
    [ -n "$STATE_ID" ] || die "no Linear state for normalized '$TARGET'"
    gql 'mutation($id:String!,$s:String!){ issueUpdate(id:$id,input:{stateId:$s}){ success issue{id identifier state{id name type}} } }' \
        "$(python3 -c 'import json,sys; print(json.dumps({"id":sys.argv[1],"s":sys.argv[2]}))' "$ID" "$STATE_ID")" \
      | EXPECTED_ID="$ID" EXPECTED_STATE_ID="$STATE_ID" python3 -c 'import sys,json,os
u=json.load(sys.stdin).get("issueUpdate") or {}
if u.get("success") is not True:
    raise SystemExit("linear: issueUpdate did not report success")
issue=u.get("issue") or {}
if str(issue.get("id") or "") != os.environ["EXPECTED_ID"]:
    raise SystemExit("linear: issueUpdate read-back did not identify the requested issue")
state=issue.get("state") or {}
if str(state.get("id") or "") != os.environ["EXPECTED_STATE_ID"]:
    raise SystemExit("linear: issueUpdate read-back did not confirm the exact target state")
print("ok " + str(issue.get("identifier") or issue.get("id") or ""))'
    ;;

  describe_board)
    # Read-only team lookup by id, against an EXPLICIT workspace argument so no
    # ambient binding can answer for the wrong org. Linear's team KEY is a real
    # authoritative identifier — it prefixes every issue — so it is read back
    # from Linear itself and never proposed locally.
    DWS="${1:?usage: describe_board <workspace> <board_id>}"
    DBID="${2:?usage: describe_board <workspace> <board_id>}"
    gql 'query($id:String!){ team(id:$id){ id key name } organization{ urlKey } }' \
        "$(printf '{"id":"%s"}' "$DBID")" \
      | WS="$DWS" BID="$DBID" python3 -c 'import sys, json, os
d = json.load(sys.stdin)
t = d.get("team") or {}
ident = str(t.get("key") or "")
if not ident:
    raise SystemExit("linear: team %s reported no authoritative key" % os.environ["BID"])
print(json.dumps({
    "board_id": str(t.get("id") or os.environ["BID"]),
    "identifier": ident,
    "workspace": str((d.get("organization") or {}).get("urlKey") or os.environ["WS"]),
    "name": str(t.get("name") or ""),
}))'
    ;;

  create_board)
    # Linear teams/projects are created by humans; the adapter resolves, not creates.
    echo "linear: create_board is a no-op (Linear team/project created via Linear UI); using resolve" >&2
    exec sh "$0" resolve
    ;;

  create_issue)
    # File a new issue on the bound team. Team comes from resolved config, never
    # from an argument. Deliberately NOT idempotent by default: two issues may
    # legitimately share a title. Pass --if-absent to reuse an issue whose title
    # already matches instead.
    IF_ABSENT=0
    case "${1:-}" in --if-absent) IF_ABSENT=1; shift ;; esac
    TITLE="${1:?usage: create_issue [--if-absent] <title> [description]}"; DESC="${2:-}"
    [ -n "$TEAM" ] || die "ticket_provider.team (Linear team key) not set"
    ISSUE=""; CREATED=true
    if [ "$IF_ABSENT" = 1 ]; then
      ISSUE="$(gql 'query($k:String!,$t:String!){ issues(first:1, filter:{team:{key:{eq:$k}}, title:{eq:$t}}){nodes{id identifier url}} }' \
          "$(python3 -c 'import json,sys; print(json.dumps({"k":sys.argv[1],"t":sys.argv[2]}))' "$TEAM" "$TITLE")" \
        | python3 -c 'import sys,json
ns=((json.load(sys.stdin).get("issues") or {}).get("nodes")) or []
print(json.dumps(ns[0]) if ns else "")')"
      [ -z "$ISSUE" ] || CREATED=false
    fi
    if [ -z "$ISSUE" ]; then
      TEAM_ID="$(gql 'query($k:String!){ teams(filter:{key:{eq:$k}}){nodes{id}} }' "$(printf '{"k":"%s"}' "$TEAM")" \
        | python3 -c 'import sys,json
ns=((json.load(sys.stdin).get("teams") or {}).get("nodes")) or []
print(ns[0].get("id","") if ns else "")')"
      [ -n "$TEAM_ID" ] || die "no Linear team with key '$TEAM'"
      ISSUE="$(gql 'mutation($team:String!,$t:String!,$d:String){ issueCreate(input:{teamId:$team,title:$t,description:$d}){ success issue{id identifier url} } }' \
          "$(python3 -c 'import json,sys; print(json.dumps({"team":sys.argv[1],"t":sys.argv[2],"d":sys.argv[3] or None}))' "$TEAM_ID" "$TITLE" "$DESC")" \
        | python3 -c 'import sys,json
r=json.load(sys.stdin).get("issueCreate") or {}
print(json.dumps(r["issue"]) if r.get("success") and r.get("issue") else "")')"
    fi
    [ -n "$ISSUE" ] || die "create_issue failed"
    printf '%s' "$ISSUE" | CREATED="$CREATED" python3 -c 'import sys,json,os
i=json.load(sys.stdin)
print(json.dumps({"issue_id":i.get("id",""),"key":i.get("identifier",""),
                  "issue_url":i.get("url",""),"created":os.environ["CREATED"]=="true"}))'
    ;;

  *) die "unknown op: $OP" ;;
esac
