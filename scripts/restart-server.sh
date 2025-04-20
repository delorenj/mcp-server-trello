#!/usr/bin/env zsh

# Restart the Trello MCP Server
# This script kills any existing server instance, rebuilds the code, and starts a new server

echo "🔄 Restarting Trello MCP Server..."

# Kill any existing server processes on port 3001
if lsof -t -i:3001 &>/dev/null; then
  echo "Stopping existing server on port 3001..."
  kill $(lsof -t -i:3001) 2>/dev/null
  sleep 1
fi

# Change to project directory (if running from elsewhere)
cd "$(dirname "$0")/.." || exit 1

# Build the project
echo "Building project..."
npm run build

# Set up environment variables
export MCP_TRANSPORT=SSE
export PORT=3001

# Start the server
echo "Starting server in SSE mode on port 3001..."
node build/index.js
