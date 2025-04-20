#!/usr/bin/env zsh

# Kill any existing Trello MCP server processes
echo "🔄 Stopping any existing Trello MCP servers..."
pkill -f "node build/index.js" || true
sleep 1

# Kill any process running on port 3001
if lsof -t -i:3001 &>/dev/null; then
  echo "Stopping process on port 3001..."
  kill $(lsof -t -i:3001) 2>/dev/null || true
  sleep 1
fi

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Start the server in the background
echo "🚀 Starting Trello MCP server in SSE mode..."
MCP_TRANSPORT=SSE PORT=3001 node build/index.js > /tmp/trello-mcp-server.log 2>&1 &
SERVER_PID=$!

# Wait for the server to start up
echo "⏳ Waiting for server to start..."
max_wait=10
count=0
while ! curl -s http://localhost:3001/health &>/dev/null && [ $count -lt $max_wait ]; do
  echo "  Still waiting... ($count/$max_wait)"
  sleep 1
  count=$((count+1))
done

if curl -s http://localhost:3001/health &>/dev/null; then
  echo "✅ Server started successfully! (PID: $SERVER_PID)"
  echo "✅ Server is now running at http://localhost:3001"
  echo "✅ Server logs available at /tmp/trello-mcp-server.log"
else
  echo "❌ Server failed to start within $max_wait seconds!"
  echo "Check the logs at /tmp/trello-mcp-server.log for errors."
  tail -n 20 /tmp/trello-mcp-server.log
  exit 1
fi

# Run the test script if the --test flag is provided
if [[ "$1" == "--test" ]]; then
  echo "\n🧪 Running test script..."
  ./scripts/test-server.sh
fi

echo "\nTo stop the server: kill $SERVER_PID"
