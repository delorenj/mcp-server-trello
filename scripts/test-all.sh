#!/usr/bin/env zsh

# Comprehensive test script that tries multiple ways to access Trello lists
# This will help identify which approach works for your specific setup

echo "🧪 Multi-approach Trello Test"
echo "============================"

# Change to project directory
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
  echo "Make sure the server is running with: ./scripts/fix-server.sh"
  exit 1
fi

# Test credentials directly
echo "\n2. Testing Trello credentials directly..."
creds_response=$(curl -s "$SERVER_URL/test-trello-credentials")
echo "Response: $creds_response"

if [[ $creds_response == *"success"*"true"* ]]; then
  echo "✅ Credentials test passed!"
  echo "Lists count: $(echo $creds_response | grep -o '"listsCount":[0-9]*' | cut -d':' -f2)"
else
  echo "❌ Credentials test failed!"
  echo "This suggests there's an issue with your Trello credentials."
fi

# Try direct API endpoint
echo "\n3. Testing direct API endpoint..."
api_response=$(curl -s "$SERVER_URL/api/trello/lists")
echo "Response first 100 chars: $(echo $api_response | head -c 100)..."

if [[ $api_response == *"id"* && $api_response == *"name"* ]]; then
  echo "✅ Direct API endpoint test passed!"
  echo "Lists count: $(echo $api_response | grep -o '"id"' | wc -l | tr -d ' ')"
else
  echo "❌ Direct API endpoint test failed!"
  echo "Full response: $api_response"
fi

# Open SSE connection
echo "\n4. Opening SSE connection..."
curl -s -N "$SERVER_URL/sse" > /tmp/sse-output.txt 2>&1 &
SSE_PID=$!

# Give it a moment to establish
sleep 2

# Get session ID from health endpoint
health_after_sse=$(curl -s "$SERVER_URL/health")
session_ids=$(echo $health_after_sse | grep -o '"sessions":\[[^]]*\]' | sed 's/"sessions":\[//g' | sed 's/\]//g' | sed 's/"//g' | sed 's/,/ /g')

if [[ -z "$session_ids" ]]; then
  echo "❌ No session ID found after SSE connection!"
  kill $SSE_PID 2>/dev/null || true
  exit 1
fi

# Take the first session ID
for session_id in $session_ids; do
  SESSION_ID=$session_id
  break
done

echo "Using session ID: $SESSION_ID"

# Test get_lists using direct endpoint
echo "\n5. Testing get_lists via direct endpoint..."
direct_lists_response=$(curl -s -X POST "$SERVER_URL/message/get_lists?sessionId=$SESSION_ID" \
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

echo "Response first 100 chars: $(echo $direct_lists_response | head -c 100)..."

if [[ $direct_lists_response == *"content"* && $direct_lists_response != *"error"* ]]; then
  echo "✅ Direct get_lists endpoint test passed!"
  
  # Extract a list ID if present
  LIST_ID=$(echo $direct_lists_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [[ ! -z "$LIST_ID" ]]; then
    echo "Found list ID: $LIST_ID"
    echo "Lists retrieved successfully!"
  else
    echo "⚠️ Response looks successful but couldn't find a list ID."
  fi
else
  echo "❌ Direct get_lists endpoint test failed!"
  echo "Full response: $direct_lists_response"
fi

# Test normal get_lists via message endpoint
echo "\n6. Testing get_lists via regular message endpoint..."
message_lists_response=$(curl -s -X POST "$SERVER_URL/message?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-message-get-lists",
    "method": "call_tool",
    "params": {
      "name": "get_lists",
      "arguments": {}
    }
  }')

echo "Response first 100 chars: $(echo $message_lists_response | head -c 100)..."

if [[ $message_lists_response == *"content"* && $message_lists_response != *"error"* ]]; then
  echo "✅ Regular message endpoint test passed!"
else
  echo "❌ Regular message endpoint test failed!"
  echo "Full response: $message_lists_response"
fi

# Clean up
kill $SSE_PID 2>/dev/null || true

echo "\n7. Testing complete."
echo "Results summary:"
echo "- Server health check: $([ $health_response == *status*ok* ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "- Credentials test: $([ $creds_response == *success*true* ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "- Direct API endpoint: $([ $api_response == *id*name* ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "- Direct get_lists endpoint: $([ $direct_lists_response == *content* && $direct_lists_response != *error* ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "- Regular message endpoint: $([ $message_lists_response == *content* && $message_lists_response != *error* ] && echo "✅ PASSED" || echo "❌ FAILED")"

if [[ $direct_lists_response == *"content"* && $direct_lists_response != *"error"* ]]; then
  echo "\n🎉 Success! At least one method works to get Trello lists."
  echo "You should be able to use get_lists with Claude now."
else
  echo "\n❌ All methods failed to retrieve Trello lists."
  echo "Please check your Trello credentials and try again."
fi