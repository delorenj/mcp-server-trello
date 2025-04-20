#!/usr/bin/env node

/**
 * MCP Transport Debug Script
 * 
 * This script tests the communication between MCP transports and the Trello API
 * to identify issues specific to the SSE transport mode.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

// Setup proper ESM paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Get environment variables
const apiKey = process.env.TRELLO_API_KEY;
const token = process.env.TRELLO_TOKEN;
const boardId = process.env.TRELLO_BOARD_ID;

// Verify configuration
if (!apiKey || !token || !boardId) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please ensure TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_BOARD_ID are set in your .env file.');
  process.exit(1);
}

console.log('Configuration:');
console.log('- Board ID:', boardId);
console.log('- API Key:', apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4));
console.log('- Token:', token.substring(0, 4) + '...' + token.substring(token.length - 4));

// Create a basic HTTP client for testing
const client = axios.create({
  baseURL: 'https://api.trello.com/1',
  params: {
    key: apiKey,
    token: token,
  },
});

// Function to test direct API calls
async function testDirectApiCall() {
  console.log('\n--- Testing Direct Trello API Call ---');
  
  try {
    const response = await client.get(`/boards/${boardId}/lists`);
    console.log('✅ Direct API call successful!');
    console.log(`Found ${response.data.length} lists on board`);
    
    // Save a test list ID for later
    if (response.data.length > 0) {
      console.log('\nLists:');
      response.data.forEach(list => {
        console.log(`- ${list.name} (ID: ${list.id})`);
      });
      return response.data[0].id; // Return first list ID for further testing
    }
    
    return null;
  } catch (error) {
    console.error('❌ Direct API call failed!');
    logAxiosError(error);
    return null;
  }
}

// Function to test SSE transport-style communication
async function simulateSseTransport() {
  console.log('\n--- Simulating SSE Transport Communication ---');
  
  // This simulates how SSE transport might handle the API call
  try {
    // Create new axios instance similar to how SSE transport might
    const sseClient = axios.create({
      baseURL: 'https://api.trello.com',  // Purposely omitting /1 to test for URL bugs
      params: {
        key: apiKey,
        token: token,
      },
    });
    
    // Try with a potentially malformed URL to see if this is the issue
    const response = await sseClient.get(`/boards/${boardId}/lists`);
    console.log('✅ SSE simulation successful (without /1 in baseURL)');
    return true;
  } catch (error) {
    console.error('❌ SSE simulation failed!');
    console.error('This suggests the issue might be with URL construction in SSE mode');
    logAxiosError(error);
    
    try {
      // Try with corrected URL to confirm the fix
      const sseClient = axios.create({
        baseURL: 'https://api.trello.com/1',  // With correct /1
        params: {
          key: apiKey,
          token: token,
        },
      });
      
      const response = await sseClient.get(`/boards/${boardId}/lists`);
      console.log('✅ SSE simulation successful when adding /1 to baseURL');
      console.log('This confirms our hypothesis that the issue is with the URL format!');
      return true;
    } catch (correctedError) {
      console.error('❌ Even corrected SSE simulation failed!');
      logAxiosError(correctedError);
      return false;
    }
  }
}

// Helper function to log axios errors consistently
function logAxiosError(error) {
  if (axios.isAxiosError(error)) {
    console.error('Status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Request URL:', error.config?.url);
    console.error('Error message:', error.message);
  } else {
    console.error('Error:', error.message);
  }
}

// Main execution
(async () => {
  console.log('🔍 Starting MCP Transport Debug...\n');
  
  // Test direct API call first
  const listId = await testDirectApiCall();
  
  // Then test SSE-style communication
  await simulateSseTransport();
  
  // Provide fix recommendations based on test results
  console.log('\n--- Debug Summary ---');
  console.log('1. If direct API calls succeeded but SSE simulation failed, the issue is likely in how URLs are constructed in SSE mode.');
  console.log('2. Check that all requests include "/1" in the Trello API URL path.');
  console.log('3. Verify that authentication params are properly included in all requests.');
  console.log('\nRecommended fixes:');
  console.log('- Ensure baseURL is correctly set to "https://api.trello.com/1" in all transport modes');
  console.log('- Check for any URL manipulation that might be removing the /1 from the path');
  console.log('- Verify axios interceptors are functioning properly in SSE mode');
  
  console.log('\n🔧 Debug complete! Use these insights to fix your MCP server.');
})();
