#!/usr/bin/env zsh

# Test script for the Trello MCP Server
# This script verifies the server is running and tests basic functionality

echo "🧪 Testing Trello MCP Server..."

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

# Check if there are active sessions already
if [[ $health_response == *"sessions"*"["*"]"* && $health_response != *"sessions"*"[]"* ]]; then
  echo "\nActive sessions found in the server!"
  # Extract the session IDs using grep and sed
  session_ids=$(echo $health_response | grep -o '"sessions":\[[^]]*\]' | sed 's/"sessions":\[//g' | sed 's/\]//g' | sed 's/"//g' | sed 's/,/ /g')
  echo "Available session IDs: $session_ids"
  
  # Take the first session ID
  for session_id in $session_ids; do
    SESSION_ID=$session_id
    break
  done
  
  echo "Using existing session ID: $SESSION_ID"
else
  # Get a session ID by connecting to SSE
  echo "\n2. Opening new SSE connection to get a session ID..."
  # Open a background connection that will keep the session alive
  curl -s -N "$SERVER_URL/sse" > /tmp/sse_output.txt 2>&1 &
  SSE_PID=$!
  
  # Give it a moment to establish
  echo "Waiting for SSE connection to establish..."
  sleep 2
  
  # Check for a session ID in the health endpoint
  health_after_sse=$(curl -s "$SERVER_URL/health")
  
  if [[ $health_after_sse == *"sessions"*"["*"]"* && $health_after_sse != *"sessions"*"[]"* ]]; then
    session_ids=$(echo $health_after_sse | grep -o '"sessions":\[[^]]*\]' | sed 's/"sessions":\[//g' | sed 's/\]//g' | sed 's/"//g' | sed 's/,/ /g')
    for session_id in $session_ids; do
      SESSION_ID=$session_id
      break
    done
    echo "Found session ID: $SESSION_ID"
  else
    echo "❌ No session ID found after connection attempt!"
    echo "Please check the server logs and try again."
    kill $SSE_PID 2>/dev/null || true
    exit 1
  fi
fi

if [[ -z "$SESSION_ID" ]]; then
  echo "❌ No session ID available. Cannot continue testing."
  exit 1
fi

# Test get_lists function
echo "\n3. Testing get_lists function..."
lists_response=$(curl -s -X POST "$SERVER_URL/message?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-get-lists",
    "method": "call_tool",
    "params": {
      "name": "get_lists",
      "arguments": {}
    }
  }')

echo "Response received: $(echo $lists_response | head -c 100)..."

if [[ $lists_response == *"content"* && $lists_response != *"isError"*"true"* ]]; then
  echo "✅ get_lists call succeeded!"
  
  # Try to extract a list ID if present
  LIST_ID=$(echo $lists_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [[ ! -z "$LIST_ID" ]]; then
    echo "✅ Found list ID: $LIST_ID"
    echo "Lists retrieved successfully!"
  else
    echo "⚠️ Response looks successful but couldn't find a list ID."
    echo "Response content: $(echo $lists_response | grep "content" | head -c 200)..."
  fi
else
  echo "❌ get_lists call failed!"
  echo "Error response: $lists_response"
fi

# If we started an SSE connection, kill it
if [[ ! -z "$SSE_PID" ]]; then
  kill $SSE_PID 2>/dev/null || true
fi

echo "\n4. Testing complete."
echo "If all tests passed, the server is working correctly!"
echo "If any tests failed, check the server logs for more information."
