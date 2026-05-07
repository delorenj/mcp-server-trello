#!/usr/bin/env bash
set -euo pipefail

echo "Installing Trello MCP skill server..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$SKILL_ROOT/assets/source"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
INSTALL_DIR="$DATA_HOME/mcp-server-trello-skill/server"
BUILD_FILE="$INSTALL_DIR/build/index.js"

if [ -d "$SOURCE_DIR/src" ] && command -v bun >/dev/null 2>&1; then
  echo "Building bundled server source with Bun..."
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  cp -R "$SOURCE_DIR"/. "$INSTALL_DIR"/

  cd "$INSTALL_DIR"
  bun install
  bun run build

  echo "Built server at $BUILD_FILE"
  echo "Configure your MCP client to run: node $BUILD_FILE"
elif command -v npx >/dev/null 2>&1; then
  echo "Bun is not available or bundled source is missing."
  echo "Falling back to Smithery install for @delorenj/mcp-server-trello..."
  npx -y @smithery/cli install @delorenj/mcp-server-trello --client claude
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR/build"
  cat >"$BUILD_FILE" <<'EOF'
#!/usr/bin/env node
const { spawn } = require('node:child_process');

const child = spawn('npx', ['-y', '@delorenj/mcp-server-trello', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(`Failed to start @delorenj/mcp-server-trello via npx: ${error.message}`);
  process.exit(1);
});
EOF
  chmod +x "$BUILD_FILE"
  echo "Created registry fallback wrapper at $BUILD_FILE"
  echo "Configure your MCP client to run: node $BUILD_FILE"
else
  echo "Unable to install: Bun is required for bundled builds, or npx is required for the registry fallback." >&2
  exit 1
fi

cat <<'MSG'

Required MCP environment variables:
  TRELLO_API_KEY
  TRELLO_TOKEN

Optional:
  TRELLO_BOARD_ID
  TRELLO_WORKSPACE_ID
  https_proxy or HTTPS_PROXY

MSG
