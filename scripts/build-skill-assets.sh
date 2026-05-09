#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/skill/assets/source"

rm -rf "$SOURCE_DIR"
mkdir -p "$SOURCE_DIR"

cp -R "$ROOT_DIR/src" "$SOURCE_DIR/src"
rm -f "$SOURCE_DIR/src/index.ts.backup"

for file in package.json tsconfig.json bun.lock LICENSE smithery.yaml; do
  if [ -f "$ROOT_DIR/$file" ]; then
    cp "$ROOT_DIR/$file" "$SOURCE_DIR/$file"
  fi
done

echo "Skill source bundle refreshed at skill/assets/source"
