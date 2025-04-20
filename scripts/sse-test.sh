#!/usr/bin/env bash
set -e
PORT=4000 MCP_TRANSPORT=SSE node build/index.js &
PID=$!
sleep 1
SESSION=$(curl -sN http://localhost:4000/sse | grep -m1 "^data:" | cut -d'?' -f2)
curl -s -o /dev/null -w "%{http_code}\n" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     "http://localhost:4000/message?$SESSION" | grep 202
kill $PID
echo "✅ SSE transport responded 202"