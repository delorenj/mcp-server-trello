#!/usr/bin/env bash
# set-version.sh <X.Y.Z> — set ALL four version literals in mcp-server-trello at
# once (package.json, server.json ×2, src/index.ts McpServer info) and flip the
# CHANGELOG "[Unreleased]" heading to the versioned one. Does NOT commit.
# This exists because `bun run versionbump` only touches package.json.
set -euo pipefail

NEW="${1:-}"
if [[ ! "$NEW" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: set-version.sh <X.Y.Z>   (e.g. set-version.sh 1.8.0)" >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
DATE="$(date +%F)"

# 1. package.json
node -e "const f='$ROOT/package.json',j=require(f);j.version='$NEW';require('fs').writeFileSync(f,JSON.stringify(j,null,2)+'\n')"

# 2 + 3. server.json (top level + packages[0])
node -e "const f='$ROOT/server.json',j=require(f);j.version='$NEW';if(j.packages&&j.packages[0])j.packages[0].version='$NEW';require('fs').writeFileSync(f,JSON.stringify(j,null,2)+'\n')"

# 4. src/index.ts McpServer info literal (anchored on the trello-server name).
perl -0pi -e "s/(name: 'trello-server',\s*\n\s*version: ')[0-9]+\.[0-9]+\.[0-9]+(')/\${1}$NEW\${2}/" src/index.ts

# 5. CHANGELOG heading: [Unreleased] -> [X.Y.Z] - DATE (first occurrence only).
if grep -q '## \[Unreleased\]' CHANGELOG.md; then
  perl -0pi -e "s/## \[Unreleased\]/## [$NEW] - $DATE/" CHANGELOG.md
  echo "note: CHANGELOG heading set to [$NEW] - $DATE — fill in the bullets."
else
  echo "warning: no '## [Unreleased]' section in CHANGELOG.md — add a '## [$NEW] - $DATE' section by hand." >&2
fi

echo "set all version literals to $NEW. Verifying parity:"
exec "$(dirname "$0")/parity-check.sh"
