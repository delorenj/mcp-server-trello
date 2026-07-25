#!/usr/bin/env sh
# Linear ticket-provider adapter (reference implementation).
#
# Credentials:  LINEAR_API_KEY
# Board binding (role.yaml `ticket_provider:`):
#   name: linear
#   team:    <TEAM_KEY>          e.g. DEL
#   project: "<Project name>"    optional; scopes milestone/issue queries
#   state_map: { in_review: "In Review", completed: "Done" }   optional overrides
#
# Implements the contract in lib/ticket-provider.sh. All Linear access goes
# through GraphQL so the same envelope works in unattended runs.
set -eu

OP="${1:-}"; shift 2>/dev/null || true
ROLE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ROLE_YAML="$ROLE_DIR/role.yaml"

die() { echo "linear: $*" >&2; exit 1; }
need_key() { [ -n "${LINEAR_API_KEY:-}" ] || die "LINEAR_API_KEY is not set"; }

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
  python3 - "$1" "$_vars" <<'PY'
import json, os, sys, urllib.request, urllib.error
q, variables = sys.argv[1], json.loads(sys.argv[2])
req = urllib.request.Request(
    "https://api.linear.app/graphql",
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

# All Linear ops require the API key; fail fast and clean before any pipe.
need_key

case "$OP" in
  resolve)
    [ -n "$TEAM" ] || die "ticket_provider.team (Linear team key) not set in role.yaml"
    gql 'query($k:String!){ teams(filter:{key:{eq:$k}}){nodes{id key name}} }' \
        "$(printf '{"k":"%s"}' "$TEAM")" \
      | python3 -c 'import sys,json; d=json.load(sys.stdin); t=(d.get("teams",{}).get("nodes") or [{}])[0]; print(json.dumps({"provider":"linear","board_id":t.get("id",""),"board_url":"https://linear.app/team/"+t.get("key","")}))'
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
    gql 'query($k:String!){ issues(first:100, filter:{team:{key:{eq:$k}}}){nodes{ id identifier title updatedAt url state{name type} assignee{name} }} }' \
        "$(printf '{"k":"%s"}' "$TEAM")" \
      | python3 -c 'import sys,json
d=json.load(sys.stdin); out=[]
for n in d.get("issues",{}).get("nodes") or []:
    st=n.get("state") or {}
    out.append({"id":n["id"],"key":n.get("identifier",""),"title":n.get("title",""),
                "state":st.get("name",""),"state_type":st.get("type",""),
                "updated_at":n.get("updatedAt",""),
                "assignee":(n.get("assignee") or {}).get("name",""),"url":n.get("url","")})
print(json.dumps(out))'
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
    gql 'mutation($id:String!,$b:String!){ commentCreate(input:{issueId:$id,body:$b}){ comment{id} success } }' \
        "$(python3 -c 'import json,sys; print(json.dumps({"id":sys.argv[1],"b":sys.argv[2]}))' "$ID" "$BODY")" \
      | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("commentCreate",{}).get("comment") or {}).get("id",""))'
    ;;

  transition)
    ID="${1:?usage: transition <id> <normalized-state>}"; TARGET="${2:?}"
    # Map normalized -> a concrete Linear state name, then resolve its id on the team.
    case "$TARGET" in
      completed)  WANT_TYPE=completed; WANT_NAME="$SM_DONE" ;;
      in_review)  WANT_TYPE=started;   WANT_NAME="$SM_IN_REVIEW" ;;
      started)    WANT_TYPE=started;   WANT_NAME="" ;;
      unstarted)  WANT_TYPE=unstarted; WANT_NAME="" ;;
      backlog)    WANT_TYPE=backlog;   WANT_NAME="" ;;
      *) die "invalid normalized state: $TARGET" ;;
    esac
    STATE_ID="$(gql 'query($id:String!){ issue(id:$id){ team{ states{nodes{id name type}} } } }' \
        "$(printf '{"id":"%s"}' "$ID")" \
      | WANT_TYPE="$WANT_TYPE" WANT_NAME="$WANT_NAME" python3 -c 'import sys,json,os
d=json.load(sys.stdin)
states=((d.get("issue") or {}).get("team") or {}).get("states",{}).get("nodes") or []
want_t=os.environ["WANT_TYPE"]; want_n=os.environ.get("WANT_NAME","")
named=[s for s in states if want_n and s["name"].lower()==want_n.lower()]
typed=[s for s in states if s.get("type")==want_t]
pick=(named or typed or [{}])[0]
print(pick.get("id",""))')"
    [ -n "$STATE_ID" ] || die "no Linear state for normalized '$TARGET'"
    gql 'mutation($id:String!,$s:String!){ issueUpdate(id:$id,input:{stateId:$s}){ success issue{identifier state{name}} } }' \
        "$(python3 -c 'import json,sys; print(json.dumps({"id":sys.argv[1],"s":sys.argv[2]}))' "$ID" "$STATE_ID")" \
      | python3 -c 'import sys,json; u=json.load(sys.stdin).get("issueUpdate",{});
print(("ok " + (u.get("issue") or {}).get("identifier","")) if u.get("success") else "FAILED"); sys.exit(0 if u.get("success") else 1)'
    ;;

  create_board)
    # Linear teams/projects are created by humans; the adapter resolves, not creates.
    echo "linear: create_board is a no-op (Linear team/project created via Linear UI); using resolve" >&2
    exec sh "$0" resolve
    ;;

  *) die "unknown op: $OP" ;;
esac
