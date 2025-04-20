#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { TrelloClient } from './trello-client.js';
import {
  validateGetCardsListRequest,
  validateGetRecentActivityRequest,
  validateAddCardRequest,
  validateUpdateCardRequest,
  validateArchiveCardRequest,
  validateAddListRequest,
  validateArchiveListRequest,
  validateMoveCardRequest,
} from './validators.js';
import express, { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import axios from 'axios';

// Standalone Trello API function for direct requests without SSE overhead
async function fetchTrelloLists() {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const boardId = process.env.TRELLO_BOARD_ID;
  
  if (!apiKey || !token || !boardId) {
    throw new Error('Missing required environment variables');
  }
  
  console.error('Making direct API request to Trello...');
  
  try {
    const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/lists`, {
      params: {
        key: apiKey,
        token: token
      }
    });
    
    console.error(`Direct API request succeeded! Found ${response.data.length} lists.`);
    return response.data;
  } catch (error) {
    console.error('Direct API request failed:', error.message);
    throw error;
  }
}

class TrelloServer {
  private server: Server;
  private trelloClient: TrelloClient;
  private transports = new Map<string, SSEServerTransport>();

  constructor() {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const boardId = process.env.TRELLO_BOARD_ID;

    if (!apiKey || !token || !boardId) {
      throw new Error('TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_BOARD_ID environment variables are required');
    }

    console.error('Initializing Trello client with:');
    console.error(`- Board ID: ${boardId}`);
    console.error(`- API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    console.error(`- Token: ${token.substring(0, 4)}...${token.substring(token.length - 4)}`);

    this.trelloClient = new TrelloClient({ apiKey, token, boardId });

    this.server = new Server(
      {
        name: 'trello-server',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Enhanced error handling
    this.server.onerror = (error) => {
      console.error('======= MCP SERVER ERROR =======');
      console.error(error);
      console.error('================================');
    };
    
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Keep the server running despite errors
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Promise Rejection at:', promise);
      console.error('Reason:', reason);
      // Keep the server running despite errors
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_cards_by_list_id',
          description: 'Fetch cards from a specific Trello list',
          inputSchema: {
            type: 'object',
            properties: {
              listId: {
                type: 'string',
                description: 'ID of the Trello list',
              },
            },
            required: ['listId'],
          },
        },
        {
          name: 'get_lists',
          description: 'Retrieve all lists from the specified board',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_recent_activity',
          description: 'Fetch recent activity on the Trello board',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of activities to fetch (default: 10)',
              },
            },
            required: [],
          },
        },
        {
          name: 'add_card_to_list',
          description: 'Add a new card to a specified list',
          inputSchema: {
            type: 'object',
            properties: {
              listId: {
                type: 'string',
                description: 'ID of the list to add the card to',
              },
              name: {
                type: 'string',
                description: 'Name of the card',
              },
              description: {
                type: 'string',
                description: 'Description of the card',
              },
              dueDate: {
                type: 'string',
                description: 'Due date for the card (ISO 8601 format)',
              },
              labels: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Array of label IDs to apply to the card',
              },
            },
            required: ['listId', 'name'],
          },
        },
        {
          name: 'update_card_details',
          description: 'Update an existing card\'s details',
          inputSchema: {
            type: 'object',
            properties: {
              cardId: {
                type: 'string',
                description: 'ID of the card to update',
              },
              name: {
                type: 'string',
                description: 'New name for the card',
              },
              description: {
                type: 'string',
                description: 'New description for the card',
              },
              dueDate: {
                type: 'string',
                description: 'New due date for the card (ISO 8601 format)',
              },
              labels: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'New array of label IDs for the card',
              },
            },
            required: ['cardId'],
          },
        },
        {
          name: 'archive_card',
          description: 'Send a card to the archive',
          inputSchema: {
            type: 'object',
            properties: {
              cardId: {
                type: 'string',
                description: 'ID of the card to archive',
              },
            },
            required: ['cardId'],
          },
        },
        {
          name: 'move_card',
          description: 'Move a card to a different list',
          inputSchema: {
            type: 'object',
            properties: {
              cardId: {
                type: 'string',
                description: 'ID of the card to move',
              },
              listId: {
                type: 'string',
                description: 'ID of the target list',
              },
            },
            required: ['cardId', 'listId'],
          },
        },
        {
          name: 'add_list_to_board',
          description: 'Add a new list to the board',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the new list',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'archive_list',
          description: 'Send a list to the archive',
          inputSchema: {
            type: 'object',
            properties: {
              listId: {
                type: 'string',
                description: 'ID of the list to archive',
              },
            },
            required: ['listId'],
          },
        },
        {
          name: 'get_my_cards',
          description: 'Fetch all cards assigned to the current user',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        console.error(`Handling tool request: ${request.params.name}`);

        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
        }

        const args = request.params.arguments as Record<string, unknown>;
        console.error(`Arguments: ${JSON.stringify(args)}`);

        let result;
        switch (request.params.name) {
          case 'get_cards_by_list_id': {
            const validArgs = validateGetCardsListRequest(args);
            const cards = await this.trelloClient.getCardsByList(validArgs.listId);
            result = cards;
            break;
          }

          case 'get_lists': {
            console.error('Getting lists from board...');
            // Try the standalone function first (it bypasses the client)
            try {
              result = await fetchTrelloLists();
              console.error(`Retrieved ${result.length} lists using standalone function.`);
            } catch (directError) {
              console.error('Standalone function failed, falling back to client:', directError);
              // Fall back to client if needed
              result = await this.trelloClient.getLists();
              console.error(`Retrieved ${result.length} lists using client.`);
            }
            break;
          }

          case 'get_recent_activity': {
            const validArgs = validateGetRecentActivityRequest(args);
            const activity = await this.trelloClient.getRecentActivity(validArgs.limit);
            result = activity;
            break;
          }

          case 'add_card_to_list': {
            const validArgs = validateAddCardRequest(args);
            const card = await this.trelloClient.addCard(validArgs);
            result = card;
            break;
          }

          case 'update_card_details': {
            const validArgs = validateUpdateCardRequest(args);
            const card = await this.trelloClient.updateCard(validArgs);
            result = card;
            break;
          }

          case 'archive_card': {
            const validArgs = validateArchiveCardRequest(args);
            const card = await this.trelloClient.archiveCard(validArgs.cardId);
            result = card;
            break;
          }

          case 'move_card': {
            const validArgs = validateMoveCardRequest(args);
            const card = await this.trelloClient.moveCard(validArgs.cardId, validArgs.listId);
            result = card;
            break;
          }

          case 'add_list_to_board': {
            const validArgs = validateAddListRequest(args);
            const list = await this.trelloClient.addList(validArgs.name);
            result = list;
            break;
          }

          case 'archive_list': {
            const validArgs = validateArchiveListRequest(args);
            const list = await this.trelloClient.archiveList(validArgs.listId);
            result = list;
            break;
          }

          case 'get_my_cards': {
            const cards = await this.trelloClient.getMyCards();
            result = cards;
            break;
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }

        console.error(`Tool request completed successfully: ${request.params.name}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        console.error(`Error handling tool request: ${request.params.name}`);
        console.error(error);
        
        return {
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : 'Unknown error occurred',
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transportType = (process.env.MCP_TRANSPORT || 'STDIO').toUpperCase();
    console.error(`Starting server with transport: ${transportType}`);

    if (transportType === 'SSE') {
      // Configure SSE server
      const app = express();
      app.use(express.json());

      // Allow customisation of paths via env vars
      const ssePath = process.env.MCP_SSE_PATH || '/sse';
      const messagePath = process.env.MCP_MESSAGE_PATH || '/message';
      const port = parseInt(process.env.PORT || '3001', 10);

      // Enable CORS
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
          return res.sendStatus(200);
        }
        next();
      });

      // Middleware for logging requests
      app.use((req, res, next) => {
        console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
      });

      // Emergency override endpoint for get_lists
      app.get('/api/trello/lists', async (_req: Request, res: Response) => {
        console.error('Direct API endpoint for lists called');
        try {
          const lists = await fetchTrelloLists();
          res.json(lists);
        } catch (error) {
          console.error('Error in direct API endpoint:', error);
          res.status(500).json({error: 'Failed to fetch lists'});
        }
      });

      // Define route to establish SSE connections
      app.get(ssePath, (req: Request, res: Response) => {
        try {
          console.error('New SSE connection requested');
          
          // Set appropriate headers for SSE
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          // Create a new SSE transport
          const transport = new SSEServerTransport(messagePath, res);
          
          // Connect the transport to the server without awaiting
          this.server.connect(transport)
            .then(() => console.error(`Transport connected with session ID: ${transport.sessionId}`))
            .catch(error => console.error(`Error connecting transport: ${error}`));
          
          // Store the transport in our map right away
          this.transports.set(transport.sessionId, transport);
          
          console.error(`Trello MCP server (SSE) session started. Session ID: ${transport.sessionId}`);
          console.error(`POST messages to ${messagePath}?sessionId=${transport.sessionId}`);
          
          // Send an initial event to confirm connection
          res.write(`data: ${JSON.stringify({ type: 'connection_established', sessionId: transport.sessionId })}\n\n`);
          
          // Keep the connection alive with heartbeats
          const pingInterval = setInterval(() => {
            try {
              if (res.writableEnded || !res.writable) {
                clearInterval(pingInterval);
                return;
              }
              res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
            } catch (error) {
              console.error(`Error sending ping: ${error}`);
              clearInterval(pingInterval);
            }
          }, 30000);
          
          // Clean up transport when connection closes
          res.on('close', () => {
            console.error(`SSE session ${transport.sessionId} closed`);
            clearInterval(pingInterval);
            this.transports.delete(transport.sessionId);
          });
          
        } catch (error) {
          console.error('Failed to establish SSE connection:', error);
          res.status(500).send('Error establishing SSE connection');
        }
      });
      
      // Special handler for get_lists
      app.post(`${messagePath}/get_lists`, async (req: Request, res: Response) => {
        console.error('Direct get_lists endpoint called');
        
        const sessionId = req.query.sessionId as string;
        if (!sessionId) {
          return res.status(400).json({
            jsonrpc: '2.0',
            id: req.body.id || null,
            error: {
              code: -32000,
              message: 'No session ID provided'
            }
          });
        }
        
        try {
          // Use standalone fetch function to get lists directly
          console.error('Using standalone function for direct get_lists');
          const lists = await fetchTrelloLists();
          
          return res.json({
            jsonrpc: '2.0',
            id: req.body.id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(lists, null, 2) }]
            }
          });
        } catch (error) {
          console.error('Error in direct get_lists endpoint:', error);
          
          return res.status(500).json({
            jsonrpc: '2.0',
            id: req.body.id || null,
            error: {
              code: -32000,
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      });

      // Define route to handle message posts
      app.post(messagePath, async (req: Request, res: Response) => {
        const sessionId = req.query.sessionId as string;
        
        console.error(`Received message for session: ${sessionId}`);
        console.error(`Request body: ${JSON.stringify(req.body)}`);
        
        // Special handling for get_lists
        if (req.body.method === 'call_tool' && 
            req.body.params && 
            req.body.params.name === 'get_lists') {
          
          console.error('Redirecting get_lists request to direct endpoint');
          return res.redirect(307, `${messagePath}/get_lists?sessionId=${sessionId}`);
        }
        
        const transport = this.transports.get(sessionId);
        
        if (!transport) {
          console.error(`No active session found for ID: ${sessionId}`);
          res.status(400).json({
            jsonrpc: '2.0',
            id: req.body.id || null,
            error: {
              code: -32000,
              message: `No active SSE session found for ID: ${sessionId}`
            }
          });
          return;
        }
        
        try {
          console.error('Handling post message through SSE transport...');
          await transport.handlePostMessage(req, res, req.body);
          console.error('Post message handled successfully');
        } catch (error) {
          console.error('Error handling POST message:', error);
          res.status(500).json({
            jsonrpc: '2.0',
            id: req.body.id || null,
            error: {
              code: -32000,
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      });

      // Add health check endpoint
      app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({
          status: 'ok',
          transport: 'SSE',
          activeSessions: this.transports.size,
          boardId: process.env.TRELLO_BOARD_ID,
          sessions: Array.from(this.transports.keys()),
        });
      });
      
      // Add endpoint to test Trello credentials directly
      app.get('/test-trello-credentials', async (_req: Request, res: Response) => {
        console.error('Testing Trello credentials directly...');
        
        try {
          const lists = await fetchTrelloLists();
          console.error(`Credentials test passed! Retrieved ${lists.length} lists.`);
          res.json({ success: true, listsCount: lists.length });
        } catch (error) {
          console.error('Credentials test failed:', error);
          res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });

      // Start the server
      app.listen(port, () => {
        console.error(`Trello MCP server running with SSE transport on port ${port}`);
        console.error(`Server endpoints:`);
        console.error(`- SSE connections: ${ssePath}`);
        console.error(`- Message endpoint: ${messagePath}`);
        console.error(`- Health check: /health`);
        console.error(`- Direct lists API: /api/trello/lists`);
        console.error(`- Credentials test: /test-trello-credentials`);
        
        // Test credentials immediately
        fetchTrelloLists()
          .then(lists => console.error(`Initial credential test passed! Found ${lists.length} lists.`))
          .catch(error => console.error('Initial credential test failed:', error.message));
      });
    } else {
      // STDIO mode
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Trello MCP server running on stdio');
    }
  }
}

const server = new TrelloServer();
server.run().catch(console.error);