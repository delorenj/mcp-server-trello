#!/usr/bin/env zsh

# Test script for the Trello MCP Server
# This script runs a proper SSE client that maintains the connection

echo "🧪 Testing Trello MCP Server in SSE mode..."

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Create a temporary directory for our Node.js script
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Create a Node.js script that properly handles SSE
cat > "$TEMP_DIR/test-sse-client.js" << 'EOL'
import fetch from 'node-fetch';
import { createInterface } from 'readline';
import { exec } from 'child_process';

const SERVER_URL = 'http://localhost:3001';
let sessionId = null;

// Function to execute a command and get output
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout || stderr);
    });
  });
};

// Check server health
const checkHealth = async () => {
  try {
    console.log('\n1. Checking server health...');
    const response = await fetch(`${SERVER_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      console.log('✅ Server is up and running!');
      console.log('Server info:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('❌ Server health check failed.');
      return false;
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    return false;
  }
};

// Connect to SSE and maintain the connection
const connectToSSE = () => {
  return new Promise((resolve) => {
    console.log('\n2. Connecting to SSE endpoint...');
    
    // Use fetch to connect to the SSE endpoint
    const evtSource = new EventSource(`${SERVER_URL}/sse`);
    
    // Log when connection is established
    evtSource.onopen = () => {
      console.log('✅ SSE connection established. Waiting for session ID...');
      
      // After a short delay, check the active connections
      setTimeout(async () => {
        try {
          // Check health to see if we have an active session
          const response = await fetch(`${SERVER_URL}/health`);
          const data = await response.json();
          
          if (data.activeSessions > 0) {
            console.log(`Active sessions: ${data.activeSessions}`);
            console.log('✅ SSE connection is being maintained by the server.');
            
            // Ask for the session ID
            const rl = createInterface({
              input: process.stdin,
              output: process.stdout
            });
            
            rl.question('Please enter the session ID from the server logs: ', (id) => {
              sessionId = id.trim();
              console.log(`Using session ID: ${sessionId}`);
              rl.close();
              resolve(true);
            });
          } else {
            console.log('❌ No active sessions found. SSE connection may not be working.');
            resolve(false);
          }
        } catch (error) {
          console.error('Error checking session status:', error);
          resolve(false);
        }
      }, 2000);
    };
    
    evtSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      resolve(false);
    };
    
    // Keep the connection open
    evtSource.onmessage = (event) => {
      console.log('Received SSE message:', event.data);
    };
  });
};

// Test get_lists function
const testGetLists = async () => {
  if (!sessionId) {
    console.log('❌ No session ID available. Cannot test get_lists.');
    return false;
  }
  
  try {
    console.log('\n3. Testing get_lists function...');
    
    const response = await fetch(`${SERVER_URL}/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-get-lists',
        method: 'call_tool',
        params: {
          name: 'get_lists',
          arguments: {}
        }
      })
    });
    
    const data = await response.text();
    console.log('Response:', data);
    
    if (data.includes('content') && !data.includes('"isError":true')) {
      console.log('✅ get_lists call succeeded!');
      
      if (data.includes('"id"') && data.includes('"name"')) {
        console.log('✅ Lists were returned successfully!');
        return true;
      } else {
        console.log('⚠️ Response looks successful but may not contain lists.');
        return false;
      }
    } else {
      console.log('❌ get_lists call failed!');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing get_lists:', error.message);
    return false;
  }
};

// Main function
const main = async () => {
  // Check server health first
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log('Server is not healthy. Make sure it is running with: ./scripts/restart-server.sh');
    process.exit(1);
  }
  
  // Connect to SSE and get session ID
  const isConnected = await connectToSSE();
  if (!isConnected) {
    console.log('Failed to establish a stable SSE connection. Check server logs for details.');
    process.exit(1);
  }
  
  // Test get_lists
  const listsSuccess = await testGetLists();
  
  console.log('\n4. Testing complete.');
  if (listsSuccess) {
    console.log('🎉 All tests passed! The server is working correctly!');
  } else {
    console.log('⚠️ Some tests failed. Check the server logs for more information.');
  }
  
  // Give the user some time to read the results before exiting
  console.log('\nPress Ctrl+C to exit...');
};

// Run the main function
main().catch(console.error);
EOL

# Create a package.json for the test script
cat > "$TEMP_DIR/package.json" << 'EOL'
{
  "name": "sse-test",
  "version": "1.0.0",
  "description": "Test script for SSE connection",
  "main": "test-sse-client.js",
  "type": "module",
  "dependencies": {
    "node-fetch": "^3.3.0",
    "eventsource": "^2.0.2"
  }
}
EOL

echo "Installing dependencies for test script..."
(cd "$TEMP_DIR" && npm install)

echo "Running SSE test client..."
(cd "$TEMP_DIR" && node test-sse-client.js)

# Clean up
echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"
