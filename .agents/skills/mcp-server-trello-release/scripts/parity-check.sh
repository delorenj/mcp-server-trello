#!/usr/bin/env bash
# parity-check.sh — assert the 5 version-bearing locations in mcp-server-trello
# all read the same X.Y.Z. Exit 0 if in parity, 1 otherwise.
# Safe to run anywhere inside the repo, and safe as a CI gate.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

pkg=$(node -p "require('$ROOT/package.json').version")
srv_top=$(node -p "require('$ROOT/server.json').version")
srv_pkg=$(node -p "require('$ROOT/server.json').packages[0].version")
# McpServer info literal — anchored on the server name so it can't match elsewhere.
mcp=$(grep -A1 "name: 'trello-server'" src/index.ts | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
# Newest changelog heading.
chlog=$(grep -m1 -oE '## \[[0-9]+\.[0-9]+\.[0-9]+\]' CHANGELOG.md | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

printf '%-28s %s\n' "package.json version"          "$pkg"
printf '%-28s %s\n' "server.json version"           "$srv_top"
printf '%-28s %s\n' "server.json packages[0]"       "$srv_pkg"
printf '%-28s %s\n' "src/index.ts McpServer info"   "$mcp"
printf '%-28s %s\n' "CHANGELOG.md newest heading"   "$chlog"

if [[ "$pkg" == "$srv_top" && "$pkg" == "$srv_pkg" && "$pkg" == "$mcp" && "$pkg" == "$chlog" ]]; then
  echo "✓ version parity: all 5 agree on $pkg"
  exit 0
fi

echo "✗ VERSION MISMATCH — fix before releasing (see scripts/set-version.sh)" >&2
exit 1
