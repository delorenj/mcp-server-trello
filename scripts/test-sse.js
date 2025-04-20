#!/usr/bin/env node

/**
 * SSE Transport Test Script
 * 
 * This script tests the SSE transport by making a request to the MCP server.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

// A function to simulate establishing an SSE connection
async function testSseConnection() {
  console.log(`Testing SSE connection to ${BASE_URL}/sse...`);
  
  try {
    // We're not actually connecting to the SSE stream here,
    // just checking if the server responds appropriately
    const response = await axios.get(`${BASE_URL}/sse`, {
      headers: {
        Accept: 'text/event-stream',
      },
      maxRedirects: 0,
      validateStatus: status => status < 400, // We expect a 200 response
      timeout: 2000, // 2 second timeout
    });
    
    console.log('Server responded to SSE request!');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    
    return true;
  } catch (error) {
    console.error('Failed to connect to SSE endpoint:');
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.error('Connection refused. Is the server running?');
      } else {
        console.error('Status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        console.error('Message:', error.message);
      }
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

// A function to test getting lists via the MCP API
async function testGetLists(sessionId) {
  console.log(`\nTesting get_lists functionality with session ${sessionId}...`);
  
  try {
    const response = await axios.post(`${BASE_URL}/message?sessionId=${sessionId}`, {
      jsonrpc: '2.0',
      id: '1',
      method: 'call_tool',
      params: {
        name: 'get_lists',
        arguments: {},
      },
    });
    
    console.log('Response received from server!');
    console.log('Status:', response.status);
    
    if (response.data.result && response.data.result.content) {
      const content = response.data.result.content;
      console.log('Response content type:', content[0]?.type);
      
      if (content[0]?.type === 'text') {
        try {
          const lists = JSON.parse(content[0].text);
          console.log(`Successfully retrieved ${lists.length} lists!`);
          console.log('Lists:');
          lists.forEach(list => {
            console.log(`- ${list.name} (ID: ${list.id})`);
          });
          return true;
        } catch (e) {
          console.error('Failed to parse lists:', e.message);
          console.error('Raw content:', content[0].text);
        }
      }
    } else if (response.data.error) {
      console.error('Server returned error:', response.data.error);
    }
    
    return false;
  } catch (error) {
    console.error('Failed to get lists:');
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.error('Message:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Starting SSE Transport Test...\n');
  
  // First, check if the server is running
  const sseConnected = await testSseConnection();
  
  if (sseConnected) {
    console.log('\n✅ SSE connection test passed!');
    console.log('\nTo test the full functionality, start a new session and get the sessionId.');
    console.log('Then run: node scripts/test-sse.js <sessionId>');
    
    // If a session ID was provided, test getting lists
    const sessionId = process.argv[2];
    if (sessionId) {
      const listsRetrieved = await testGetLists(sessionId);
      
      if (listsRetrieved) {
        console.log('\n✅ get_lists test passed!');
        console.log('\nThe MCP server appears to be working correctly with the SSE transport!');
      } else {
        console.log('\n❌ get_lists test failed!');
        console.log('\nThe server is running, but there may still be issues with the Trello API integration.');
      }
    }
  } else {
    console.log('\n❌ SSE connection test failed!');
    console.log('\nMake sure the server is running with:');
    console.log('MCP_TRANSPORT=SSE PORT=3001 node build/index.js');
  }
  
  console.log('\n🔧 Test complete!');
}

// Run the main function
main().catch(console.error);
