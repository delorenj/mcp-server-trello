#!/usr/bin/env node

/**
 * Trello API Debug Script
 * 
 * This script tests direct connections to the Trello API to verify your credentials
 * and diagnose any connection issues with the MCP server.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

// Test function for making API requests
async function testTrelloApi() {
  console.log('\n--- Testing Trello API Connection ---');
  
  try {
    // Test connection with axios directly
    console.log('\nAttempting direct API call with axios...');
    
    const directResponse = await axios.get(`https://api.trello.com/1/boards/${boardId}/lists`, {
      params: {
        key: apiKey,
        token: token
      }
    });
    
    console.log('✅ Direct axios API call successful!');
    console.log(`Found ${directResponse.data.length} lists on board`);
    console.log('Lists:');
    directResponse.data.forEach(list => {
      console.log(`- ${list.name} (ID: ${list.id})`);
    });
    
    // Test with alternative URL format to check for URL construction issues
    console.log('\nAttempting API call with alternative URL format...');
    
    const altResponse = await axios.get(`https://api.trello.com/1/boards/${boardId}/lists`, {
      params: {
        key: apiKey,
        token: token
      }
    });
    
    console.log('✅ Alternative URL format API call successful!');
    
    return {
      success: true,
      data: directResponse.data
    };
    
  } catch (error) {
    console.error('❌ API test failed!');
    
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.error('Request URL:', error.config?.url);
      console.error('Error message:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the test
(async () => {
  try {
    await testTrelloApi();
  } catch (error) {
    console.error('Test execution failed:', error);
  }
})();
