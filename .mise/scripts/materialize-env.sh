#!/bin/sh
set -eu

script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
project_dir=$(CDPATH= cd "$script_dir/../.." && pwd -P)
source_file="$project_dir/.env.op"
target_file="$project_dir/.env"

# Missing, whitespace-only, and comment-only templates intentionally opt out.
if [ ! -f "$source_file" ] || ! grep -Eq '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=' "$source_file"; then
  exit 0
fi

# Entering a project without the 1Password CLI must not damage an existing .env.
if ! command -v op >/dev/null 2>&1; then
  exit 0
fi

umask 077
temp_file=$(mktemp "$project_dir/.env.inject.XXXXXX")
cleanup() {
  rm -f -- "$temp_file"
}
trap cleanup EXIT HUP INT TERM

# op opens /dev/tty for prompts. This hook runs inside whatever terminal
# entered the project (often an agent's pane), so op is detached from it:
# a prompt must fail, never read the user's keystrokes. macOS has no setsid.
if command -v setsid >/dev/null 2>&1; then
  setsid -w op inject -i "$source_file" -o "$temp_file" --force </dev/null
else
  op inject -i "$source_file" -o "$temp_file" --force </dev/null
fi
mv -f -- "$temp_file" "$target_file"
trap - EXIT HUP INT TERM
