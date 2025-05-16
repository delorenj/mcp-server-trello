#!/usr/bin/env node
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
  validateAttachImageRequest,
  validateSetActiveBoardRequest,
  validateSetActiveWorkspaceRequest,
  validateListBoardsInWorkspaceRequest,
} from './validators.js';

class TrelloServer {
  private server: Server;
  private trelloClient: TrelloClient;

  constructor() {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const boardId = process.env.TRELLO_BOARD_ID;

    if (!apiKey || !token || !boardId) {
      throw new Error('TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_BOARD_ID environment variables are required');
    }

    this.trelloClient = new TrelloClient({ apiKey, token, boardId });

    this.server = new Server(
      {
        name: 'trello-server',
        version: '0.3.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
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
        {
          name: 'attach_image_to_card',
          description: 'Attach an image to a card directly from a URL',
          inputSchema: {
            type: 'object',
            properties: {
              cardId: {
                type: 'string',
                description: 'ID of the card to attach the image to',
              },
              imageUrl: {
                type: 'string',
                description: 'URL of the image to attach',
              },
              name: {
                type: 'string',
                description: 'Optional name for the attachment (defaults to "Image Attachment")',
              },
            },
            required: ['cardId', 'imageUrl'],
          },
        },
        {
          name: 'list_boards',
          description: 'List all boards the user has access to',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'set_active_board',
          description: 'Set the active board for future operations',
          inputSchema: {
            type: 'object',
            properties: {
              boardId: {
                type: 'string',
                description: 'ID of the board to set as active',
              },
            },
            required: ['boardId'],
          },
        },
        {
          name: 'list_workspaces',
          description: 'List all workspaces the user has access to',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'set_active_workspace',
          description: 'Set the active workspace for future operations',
          inputSchema: {
            type: 'object',
            properties: {
              workspaceId: {
                type: 'string',
                description: 'ID of the workspace to set as active',
              },
            },
            required: ['workspaceId'],
          },
        },
        {
          name: 'list_boards_in_workspace',
          description: 'List all boards in a specific workspace',
          inputSchema: {
            type: 'object',
            properties: {
              workspaceId: {
                type: 'string',
                description: 'ID of the workspace to list boards from',
              },
            },
            required: ['workspaceId'],
          },
        },
        {
          name: 'get_active_board_info',
          description: 'Get information about the currently active board',
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
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
        }

        const args = request.params.arguments as Record<string, unknown>;

        switch (request.params.name) {
          case 'get_cards_by_list_id': {
            const validArgs = validateGetCardsListRequest(args);
            const cards = await this.trelloClient.getCardsByList(validArgs.listId);
            return {
              content: [{ type: 'text', text: JSON.stringify(cards, null, 2) }],
            };
          }

          case 'get_lists': {
            const lists = await this.trelloClient.getLists();
            return {
              content: [{ type: 'text', text: JSON.stringify(lists, null, 2) }],
            };
          }

          case 'get_recent_activity': {
            const validArgs = validateGetRecentActivityRequest(args);
            const activity = await this.trelloClient.getRecentActivity(validArgs.limit);
            return {
              content: [{ type: 'text', text: JSON.stringify(activity, null, 2) }],
            };
          }

          case 'add_card_to_list': {
            const validArgs = validateAddCardRequest(args);
            const card = await this.trelloClient.addCard(validArgs);
            return {
              content: [{ type: 'text', text: JSON.stringify(card, null, 2) }],
            };
          }

          case 'update_card_details': {
            const validArgs = validateUpdateCardRequest(args);
            const card = await this.trelloClient.updateCard(validArgs);
            return {
              content: [{ type: 'text', text: JSON.stringify(card, null, 2) }],
            };
          }

          case 'archive_card': {
            const validArgs = validateArchiveCardRequest(args);
            const card = await this.trelloClient.archiveCard(validArgs.cardId);
            return {
              content: [{ type: 'text', text: JSON.stringify(card, null, 2) }],
            };
          }

          case 'move_card': {
            const validArgs = validateMoveCardRequest(args);
            const card = await this.trelloClient.moveCard(validArgs.cardId, validArgs.listId);
            return {
              content: [{ type: 'text', text: JSON.stringify(card, null, 2) }],
            };
          }

          case 'add_list_to_board': {
            const validArgs = validateAddListRequest(args);
            const list = await this.trelloClient.addList(validArgs.name);
            return {
              content: [{ type: 'text', text: JSON.stringify(list, null, 2) }],
            };
          }

          case 'archive_list': {
            const validArgs = validateArchiveListRequest(args);
            const list = await this.trelloClient.archiveList(validArgs.listId);
            return {
              content: [{ type: 'text', text: JSON.stringify(list, null, 2) }],
            };
          }

          case 'get_my_cards': {
            const cards = await this.trelloClient.getMyCards();
            return {
              content: [{ type: 'text', text: JSON.stringify(cards, null, 2) }],
            };
          }

          case 'attach_image_to_card': {
            const validArgs = validateAttachImageRequest(args);
            try {
              const attachment = await this.trelloClient.attachImageToCard(
                validArgs.cardId, 
                validArgs.imageUrl, 
                validArgs.name
              );
              return {
                content: [{ type: 'text', text: JSON.stringify(attachment, null, 2) }],
              };
            } catch (error) {
              return this.handleErrorResponse(error);
            }
          }

          case 'list_boards': {
            const boards = await this.trelloClient.listBoards();
            return {
              content: [{ type: 'text', text: JSON.stringify(boards, null, 2) }],
            };
          }

          case 'set_active_board': {
            const validArgs = validateSetActiveBoardRequest(args);
            try {
              const board = await this.trelloClient.setActiveBoard(validArgs.boardId);
              return {
                content: [{ 
                  type: 'text', 
                  text: `Successfully set active board to "${board.name}" (${board.id})`
                }],
              };
            } catch (error) {
              return this.handleErrorResponse(error);
            }
          }

          case 'list_workspaces': {
            const workspaces = await this.trelloClient.listWorkspaces();
            return {
              content: [{ type: 'text', text: JSON.stringify(workspaces, null, 2) }],
            };
          }

          case 'set_active_workspace': {
            const validArgs = validateSetActiveWorkspaceRequest(args);
            try {
              const workspace = await this.trelloClient.setActiveWorkspace(validArgs.workspaceId);
              return {
                content: [{ 
                  type: 'text', 
                  text: `Successfully set active workspace to "${workspace.displayName}" (${workspace.id})`
                }],
              };
            } catch (error) {
              return this.handleErrorResponse(error);
            }
          }

          case 'list_boards_in_workspace': {
            const validArgs = validateListBoardsInWorkspaceRequest(args);
            try {
              const boards = await this.trelloClient.listBoardsInWorkspace(validArgs.workspaceId);
              return {
                content: [{ type: 'text', text: JSON.stringify(boards, null, 2) }],
              };
            } catch (error) {
              return this.handleErrorResponse(error);
            }
          }

          case 'get_active_board_info': {
            try {
              const boardId = this.trelloClient.activeBoardId;
              const board = await this.trelloClient.getBoardById(boardId);
              return {
                content: [{ 
                  type: 'text', 
                  text: JSON.stringify({
                    ...board,
                    isActive: true,
                    activeWorkspaceId: this.trelloClient.activeWorkspaceId || 'Not set'
                  }, null, 2)
                }],
              };
            } catch (error) {
              return this.handleErrorResponse(error);
            }
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
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

  private handleErrorResponse(error: unknown) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    // Load configuration before starting the server
    await this.trelloClient.loadConfig().catch((error) => {
      console.error('Failed to load saved configuration:', error);
      // Continue with default config if loading fails
    });
    await this.server.connect(transport);
    console.error('Trello MCP server running on stdio');
  }
}

const server = new TrelloServer();
server.run().catch(console.error);
