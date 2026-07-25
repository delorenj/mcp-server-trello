#!/usr/bin/env sh
# Trello ticket-provider adapter.
#
# Credentials:  TRELLO_KEY  TRELLO_TOKEN   (query-param auth)
# Board binding (role.yaml `ticket_provider:`):
#   name: trello
#   board: <board-id>                 (set by create_board / 42-ticket-provider)
#   state_map: { backlog:"Backlog", unstarted:"To Do", started:"In Progress",
#                in_review:"Review", completed:"Done" }   optional
#
# Trello model:  board = project & milestone, list = state, card = issue.
# Trello has no milestone primitive, so active_milestone returns the board.
#
# NOTE: list names are matched case-insensitively against state_map; override
# state_map in role.yaml if the board uses different column names.
set -eu

OP="${1:-}"; shift 2>/dev/null || true
ROLE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ROLE_YAML="$ROLE_DIR/role.yaml"
API="https://api.trello.com/1"

die() { echo "trello: $*" >&2; exit 1; }
need_key() { [ -n "${TRELLO_KEY:-}" ] && [ -n "${TRELLO_TOKEN:-}" ] || die "TRELLO_KEY and TRELLO_TOKEN must be set"; }

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

BOARD="$(pj_cfg board_id)"; [ -n "$BOARD" ] || BOARD="$(tp_cfg board)"
# Normalized -> Trello list name (overridable via role.yaml state_map keys).
list_name_for() {
  case "$1" in
    backlog)   v="$(tp_cfg backlog)";   printf '%s' "${v:-Backlog}" ;;
    unstarted) v="$(tp_cfg unstarted)"; printf '%s' "${v:-To Do}" ;;
    started)   v="$(tp_cfg started)";   printf '%s' "${v:-In Progress}" ;;
    in_review) v="$(tp_cfg in_review)"; printf '%s' "${v:-Review}" ;;
    completed) v="$(tp_cfg completed)"; printf '%s' "${v:-Done}" ;;
    *) die "invalid normalized state: $1" ;;
  esac
}

# api METHOD PATH [extra-query] — call Trello, auth appended, print body.
api() {
  need_key
  method="$1"; path="$2"; extra="${3:-}"
  sep="?"; case "$path" in *\?*) sep="&" ;; esac
  url="$API/$path${sep}key=$TRELLO_KEY&token=$TRELLO_TOKEN${extra:+&$extra}"
  curl -fsS -X "$method" "$url"
}

# Resolve a list id on the board by (normalized) state.
list_id_for() {
  [ -n "$BOARD" ] || die "ticket_provider.board not set"
  want="$(list_name_for "$1")"
  api GET "boards/$BOARD/lists" | NM="$want" python3 -c 'import sys,json,os
rows=json.load(sys.stdin); nm=os.environ["NM"].lower()
print(next((l["id"] for l in rows if l.get("name","").lower()==nm), ""))'
}

# All Trello ops require credentials; fail fast and clean before any pipe.
need_key

case "$OP" in
  resolve)
    [ -n "$BOARD" ] || die "board not set (run 42-ticket-provider.sh)"
    api GET "boards/$BOARD" "fields=name,url" | python3 -c 'import sys,json
b=json.load(sys.stdin); print(json.dumps({"provider":"trello","board_id":b.get("id",""),"board_url":b.get("url","")}))'
    ;;

  active_milestone)
    [ -n "$BOARD" ] || die "board not set"
    api GET "boards/$BOARD" "fields=name" | python3 -c 'import sys,json
b=json.load(sys.stdin); print(json.dumps({"id":b.get("id",""),"name":b.get("name",""),"state":"active"}))'
    ;;

  list_issues)
    [ -n "$BOARD" ] || die "board not set"
    # cards + lists, then label each card with its list name as the state.
    LISTS="$(api GET "boards/$BOARD/lists" "fields=name")"
    CARDS="$(api GET "boards/$BOARD/cards" "fields=name,idList,dateLastActivity,url,shortLink")"
    printf '%s\n%s\n' "$LISTS" "$CARDS" | python3 -c 'import sys,json
parts=sys.stdin.read().split("\n",1)
lists={l["id"]:l.get("name","") for l in json.loads(parts[0] or "[]")}
out=[]
for c in json.loads(parts[1] or "[]"):
    nm=lists.get(c.get("idList",""),"")
    out.append({"id":c.get("id",""),"key":c.get("shortLink",""),"title":c.get("name",""),
                "state":nm,"state_type":nm.lower().replace(" ","_"),
                "updated_at":c.get("dateLastActivity",""),"assignee":"","url":c.get("url","")})
print(json.dumps(out))'
    ;;

  get_issue)
    ID="${1:?usage: get_issue <id>}"
    CARD="$(api GET "cards/$ID" "fields=name,desc,idList")"
    COMM="$(api GET "cards/$ID/actions" "filter=commentCard")"
    printf '%s\n%s\n' "$CARD" "$COMM" | python3 -c 'import sys,json
parts=sys.stdin.read().split("\n",1)
c=json.loads(parts[0] or "{}"); acts=json.loads(parts[1] or "[]")
cs=[{"id":a.get("id",""),"body":(a.get("data") or {}).get("text",""),"author":(a.get("memberCreator") or {}).get("fullName","")} for a in acts]
print(json.dumps({"id":c.get("id",""),"key":c.get("id",""),"title":c.get("name",""),
                  "description":c.get("desc",""),"acceptance":c.get("desc",""),
                  "state":"","state_type":"","comments":cs}))'
    ;;

  comment)
    ID="${1:?usage: comment <id> <body>}"; BODY="${2:?}"
    api POST "cards/$ID/actions/comments" "text=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$BODY")" \
      | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))'
    ;;

  transition)
    ID="${1:?usage: transition <id> <normalized-state>}"; TARGET="${2:?}"
    LID="$(list_id_for "$TARGET")"
    [ -n "$LID" ] || die "no Trello list mapped for normalized '$TARGET' (check state_map)"
    api PUT "cards/$ID" "idList=$LID" | python3 -c 'import sys,json; c=json.load(sys.stdin); print("ok "+c.get("id",""))'
    ;;

  create_board)
    NAME="${1:?usage: create_board <name> <ident> <desc>}"
    EXIST="$(api GET "members/me/boards" "fields=name" | NM="$NAME" python3 -c 'import sys,json,os
rows=json.load(sys.stdin); nm=os.environ["NM"].lower()
print(next((b["id"] for b in rows if b.get("name","").lower()==nm), ""))')"
    if [ -n "$EXIST" ]; then BID="$EXIST"; else
      BID="$(api POST "boards/" "name=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$NAME")&defaultLists=true" \
        | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))')"
    fi
    [ -n "$BID" ] || die "create_board failed"
    api GET "boards/$BID" "fields=url" | BID="$BID" python3 -c 'import sys,json,os
b=json.load(sys.stdin); print(json.dumps({"board_id":os.environ["BID"],"board_url":b.get("url","")}))'
    ;;

  *) die "unknown op: $OP" ;;
esac
