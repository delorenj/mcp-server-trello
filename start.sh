#!/usr/bin/env bash
# Wrapper script to launch mcp-server-trello with credentials from macOS Keychain.
# Used by .mcp.json so plaintext credentials are not stored in config files.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export TRELLO_API_KEY=$(security find-generic-password -s "trello-api-key" -w 2>/dev/null)
export TRELLO_TOKEN=$(security find-generic-password -s "trello-api-token" -w 2>/dev/null)
export TRELLO_BOARD_ID=$(security find-generic-password -s "trello-board-id" -w 2>/dev/null || true)

exec node "${SCRIPT_DIR}/build/index.js"
