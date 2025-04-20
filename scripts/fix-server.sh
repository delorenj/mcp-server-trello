#!/usr/bin/env zsh

# A simple, reliable script to kill any existing server process, rebuild the code,
# and start a fresh server instance with the SSE transport

echo "🔄 Restarting Trello MCP Server..."

# Kill any existing Trello MCP server processes
pkill -f "node build/index.js" || true
sleep 1

# Kill any processes running on port 3001
if lsof -t -i:3001 &>/dev/null; then
  echo "Stopping existing process on port 3001..."
  kill $(lsof -t -i:3001) 2>/dev/null || true
  sleep 1
fi

# Change to project directory
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
