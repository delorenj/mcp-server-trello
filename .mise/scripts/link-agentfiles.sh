#!/bin/bash
set -eu

# Symlink the per-CLI agent instruction files at AGENTS.md.
#
# A mise ENTER hook runs with cwd set to the directory the user cd'd into, NOT
# to config_root — measured on mise 2026.8.10, and true even for a parent config
# when the entered directory is a nested child. `mise run <task>` does run at
# config_root, which is why the old cwd-relative version looked correct for
# years: only the enter-hook path was wrong. So take the root explicitly, and
# fall back to this script's own location — never to cwd.
root="${1:-${MISE_CONFIG_ROOT:-}}"
own_root=$(CDPATH= cd "$(dirname "$0")/../.." && pwd -P)
if [ -z "$root" ]; then
  root="$own_root"
else
  root=$(CDPATH= cd "$root" && pwd -P)
fi
if [ "$root" != "$own_root" ]; then
  echo "link-agentfiles: refusing to act on $root; this script belongs to $own_root" >&2
  echo "link-agentfiles: a nested repo must ship its own .mise/scripts copy" >&2
  exit 1
fi

CDPATH= cd "$root"
if [ ! -f AGENTS.md ]; then
  echo "No AGENTS.md in $root. Nothing to symlink."
  exit 0
fi

# `ln -sf` cannot tell a stale link it owns from a real file it must not touch:
# -f means "unlink whatever is there". A hand-written CLAUDE.md was silently
# replaced by a symlink, and the script printed a green checkmark while doing it.
for name in CLAUDE.md GEMINI.md; do
  if [ -e "$name" ] && [ ! -L "$name" ]; then
    echo "link-agentfiles: refusing to replace the real file $root/$name with a symlink" >&2
    echo "link-agentfiles: move its content into AGENTS.md, then delete $name" >&2
    exit 1
  fi
  ln -sfn AGENTS.md "$name"
done
echo "✅ AGENTS.md links verified in $root"
