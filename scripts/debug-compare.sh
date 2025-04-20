#!/usr/bin/env zsh

# Debug script to compare STDIO and SSE transport modes
# This will help us identify the exact differences in how credentials are passed

echo "🔍 Trello Transport Comparison Debug"
echo "==================================="

# Kill any existing processes
pkill -f "node build/index.js" || true
sleep 1
if lsof -t -i:3001 &>/dev/null; then
  kill $(lsof -t -i:3001) 2>/dev/null || true
  sleep 1
fi

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Make sure we're using the latest .env values
source .env

echo "🔄 Rebuilding project..."
npm run build

echo "\n📊 Current Environment Variables"
echo "===============================\n"
echo "TRELLO_BOARD_ID: ${TRELLO_BOARD_ID}"
echo "TRELLO_API_KEY: ${TRELLO_API_KEY:0:4}...${TRELLO_API_KEY: -4}"
echo "TRELLO_TOKEN: ${TRELLO_TOKEN:0:4}...${TRELLO_TOKEN: -4}"

# Function to run a curl test against Trello API directly
test_direct_trello_api() {
  echo "\n🧪 Testing Direct Trello API Access"
  echo "=================================="
  
  # Create URL with credentials for direct testing
  TRELLO_URL="https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}"
  
  echo "\nTesting URL: ${TRELLO_URL/key=*/key=***}${TRELLO_URL/*&token=/&token=***}"
  
  # Try direct API call with curl
  RESPONSE=$(curl -s "$TRELLO_URL")
  
  if [[ $RESPONSE == "invalid app token" ]]; then
    echo "❌ Direct API call failed: invalid app token"
    return 1
  elif [[ $RESPONSE == *"\"id\""* ]]; then
    echo "✅ Direct API call succeeded!"
    echo "Found $(echo $RESPONSE | grep -o "\"id\"" | wc -l | tr -d ' ') lists"
    return 0
  else
    echo "❓ Unexpected response: $RESPONSE"
    return 1
  fi
}

# Test STDIO mode
test_stdio_mode() {
  echo "\n🧪 Testing STDIO Transport Mode"
  echo "============================="
  
  # Run the server with STDIO transport (with verbose output)
  echo "Running server with STDIO transport..."
  OUTPUT=$(MCP_TRANSPORT=STDIO node build/index.js 2>&1 << EOF
{"jsonrpc":"2.0","id":"test-stdio","method":"list_tools"}
{"jsonrpc":"2.0","id":"test-get-lists","method":"call_tool","params":{"name":"get_lists","arguments":{}}}
EOF
)
  
  echo "Server output:"
  echo "$OUTPUT"
  
  if [[ $OUTPUT == *"invalid app token"* ]]; then
    echo "❌ STDIO mode test failed: invalid app token"
    return 1
  elif [[ $OUTPUT == *"\"content\""* && $OUTPUT == *"\"id\""* ]]; then
    echo "✅ STDIO mode test succeeded!"
    return 0
  else
    echo "❓ Unexpected response from STDIO mode"
    return 1
  fi
}

# Test SSE mode
test_sse_mode() {
  echo "\n🧪 Testing SSE Transport Mode"
  echo "==========================="
  
  # Start server with SSE transport in background
  echo "Starting server with SSE transport..."
  MCP_TRANSPORT=SSE PORT=3001 node build/index.js > /tmp/trello-sse-debug.log 2>&1 &
  SERVER_PID=$!
  
  # Give it a moment to start
  sleep 2
  
  # Check if server is running
  if ! ps -p $SERVER_PID > /dev/null; then
    echo "❌ Server failed to start. Check logs at /tmp/trello-sse-debug.log"
    cat /tmp/trello-sse-debug.log
    return 1
  fi
  
  # Open SSE connection
  echo "Opening SSE connection..."
  curl -N http://localhost:3001/sse > /tmp/sse-output.txt 2>&1 &
  SSE_PID=$!
  
  # Give it a moment to establish the connection
  sleep 2
  
  # Get session ID from logs
  SESSION_ID=$(grep -o "session started. Session ID: [a-z0-9-]*" /tmp/trello-sse-debug.log | head -1 | awk '{print $NF}')
  
  if [[ -z "$SESSION_ID" ]]; then
    echo "❌ Failed to get session ID"
    kill $SERVER_PID $SSE_PID 2>/dev/null || true
    cat /tmp/trello-sse-debug.log
    return 1
  fi
  
  echo "Using session ID: $SESSION_ID"
  
  # Make a call_tool request for get_lists
  echo "Testing get_lists via SSE transport..."
  RESPONSE=$(curl -s -X POST "http://localhost:3001/message/get_lists?sessionId=$SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "id": "test-sse-get-lists",
      "method": "call_tool",
      "params": {
        "name": "get_lists",
        "arguments": {}
      }
    }')
  
  # Cleanup
  kill $SERVER_PID $SSE_PID 2>/dev/null || true
  
  echo "Response: $RESPONSE"
  
  if [[ $RESPONSE == *"invalid app token"* ]]; then
    echo "❌ SSE mode test failed: invalid app token"
    echo "Check the full logs for more details:"
    cat /tmp/trello-sse-debug.log
    return 1
  elif [[ $RESPONSE == *"\"content\""* ]]; then
    echo "✅ SSE mode test succeeded!"
    return 0
  else
    echo "❓ Unexpected response from SSE mode"
    cat /tmp/trello-sse-debug.log
    return 1
  fi
}

# Run the tests
test_direct_trello_api
DIRECT_RESULT=$?

test_stdio_mode
STDIO_RESULT=$?

test_sse_mode
SSE_RESULT=$?

# Summarize results
echo "\n📋 Test Summary"
echo "=============="
echo "Direct API test: $([ $DIRECT_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "STDIO mode test: $([ $STDIO_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "SSE mode test: $([ $SSE_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"

# Provide analysis
echo "\n🔍 Analysis"
echo "=========="

if [ $DIRECT_RESULT -eq 0 ] && [ $STDIO_RESULT -eq 0 ] && [ $SSE_RESULT -eq 0 ]; then
  echo "All tests passed! The issue appears to be fixed."
elif [ $DIRECT_RESULT -eq 0 ] && [ $STDIO_RESULT -eq 0 ] && [ $SSE_RESULT -ne 0 ]; then
  echo "The Trello API and STDIO transport work, but SSE transport fails."
  echo "This suggests there is still a difference in how credentials are passed between the two transports."
elif [ $DIRECT_RESULT -ne 0 ] && [ $STDIO_RESULT -eq 0 ]; then
  echo "Direct API calls fail but STDIO transport works!"
  echo "This suggests STDIO is using a different credential format or authentication method."
elif [ $DIRECT_RESULT -eq 0 ] && [ $STDIO_RESULT -ne 0 ]; then
  echo "Direct API calls work but STDIO transport fails!"
  echo "This suggests there's an issue with the MCP server configuration."
else
  echo "All tests failed! Check that your credentials are correct and that Trello API is accessible."
fi

echo "\nLog files available for inspection:"
echo "- SSE transport log: /tmp/trello-sse-debug.log"
echo "- SSE connection output: /tmp/sse-output.txt"