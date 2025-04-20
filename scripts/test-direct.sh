#!/usr/bin/env zsh

# Test script specifically for Trello lists endpoint
# This uses curl to directly test the get_lists functionality

echo "🧪 Testing Direct Get Lists Endpoint..."

# Change to project directory (if running from elsewhere)
cd "$(dirname "$0")/.." || exit 1

SERVER_URL="http://localhost:3001"

# Test server health
echo "\n1. Testing server health..."
health_response=$(curl -s "$SERVER_URL/health")

if [[ $health_response == *"status"*"ok"* ]]; then
  echo "✅ Server is up and running!"
  echo "Server info: $health_response"
else
  echo "❌ Server health check failed. Response: $health_response"
  echo "Make sure the server is running with: ./scripts/restart-server.sh"
  exit 1
fi

# Get a session ID
echo "\n2. Opening new SSE connection to get a session ID..."
# Open a background connection that will keep the session alive
curl -s -N "$SERVER_URL/sse" > /tmp/sse_output.txt 2>&1 &
SSE_PID=$!

# Give it a moment to establish
echo "Waiting for SSE connection to establish..."
sleep 2

# Get session ID from health endpoint
health_response=$(curl -s "$SERVER_URL/health")
session_ids=$(echo $health_response | grep -o '"sessions":\[[^]]*\]' | sed 's/"sessions":\[//g' | sed 's/\]//g' | sed 's/"//g' | sed 's/,/ /g')

if [[ -z "$session_ids" ]]; then
  echo "❌ No session ID found! Checking SSE output..."
  cat /tmp/sse_output.txt
  kill $SSE_PID 2>/dev/null || true
  exit 1
fi

# Take the first session ID
for session_id in $session_ids; do
  SESSION_ID=$session_id
  break
done

echo "Using session ID: $SESSION_ID"

# Test get_lists function by calling the direct endpoint
echo "\n3. Testing direct get_lists endpoint..."
lists_response=$(curl -s -X POST "$SERVER_URL/message/get_lists?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-direct-get-lists",
    "method": "call_tool",
    "params": {
      "name": "get_lists",
      "arguments": {}
    }
  }')

echo "Response: $lists_response"

if [[ $lists_response == *"content"* && $lists_response != *"error"* ]]; then
  echo "✅ Direct get_lists endpoint test passed!"
  
  # Extract a list ID if present
  LIST_ID=$(echo $lists_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [[ ! -z "$LIST_ID" ]]; then
    echo "✅ Found list ID: $LIST_ID"
    echo "Lists retrieved successfully!"
  else
    echo "⚠️ Response looks successful but couldn't find a list ID."
  fi
else
  echo "❌ Direct get_lists endpoint test failed!"
fi

# Clean up
kill $SSE_PID 2>/dev/null || true

echo "\n4. Testing complete."