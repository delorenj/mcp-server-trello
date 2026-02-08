#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TrelloClient } from './trello-client.js';
import { TrelloHealthEndpoints, HealthEndpointSchemas } from './health/health-endpoints.js';

class TrelloServer {
  private server: McpServer;
  private trelloClient: TrelloClient;
  private healthEndpoints: TrelloHealthEndpoints;

  constructor() {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const defaultBoardId = process.env.TRELLO_BOARD_ID;

    if (!apiKey || !token) {
      throw new Error('TRELLO_API_KEY and TRELLO_TOKEN environment variables are required');
    }

    this.trelloClient = new TrelloClient({
      apiKey,
      token,
      defaultBoardId,
      boardId: defaultBoardId,
    });

    this.healthEndpoints = new TrelloHealthEndpoints(this.trelloClient);

    this.server = new McpServer({
      name: 'trello-server',
      version: '1.0.0',
    });

    this.setupTools();
    this.setupHealthEndpoints();

    // Error handling
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private handleError(error: unknown) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }

  private setupTools() {
    // Get cards from a specific list
    this.server.registerTool(
      'get_cards_by_list_id',
      {
        title: 'Get Cards by List ID',
        description: 'Fetch cards from a specific Trello list on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          listId: z.string().describe('ID of the Trello list'),
        },
      },
      async ({ boardId, listId }) => {
        try {
          const cards = await this.trelloClient.getCardsByList(boardId, listId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(cards, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Get all lists from a board
    this.server.registerTool(
      'get_lists',
      {
        title: 'Get Lists',
        description: 'Retrieve all lists from the specified board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ boardId }) => {
        try {
          const lists = await this.trelloClient.getLists(boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(lists, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Get recent activity
    this.server.registerTool(
      'get_recent_activity',
      {
        title: 'Get Recent Activity',
        description: 'Fetch recent activity on the Trello board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of activities to fetch (default: 10)'),
        },
      },
      async ({ boardId, limit }) => {
        try {
          const activity = await this.trelloClient.getRecentActivity(boardId, limit);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(activity, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Add a new card to a list
    this.server.registerTool(
      'add_card_to_list',
      {
        title: 'Add Card to List',
        description: 'Add a new card to a specified list on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          listId: z.string().describe('ID of the list to add the card to'),
          name: z.string().describe('Name of the card'),
          description: z.string().optional().describe('Description of the card'),
          dueDate: z.string().optional().describe('Due date for the card (ISO 8601 format)'),
          start: z
            .string()
            .optional()
            .describe('Start date for the card (YYYY-MM-DD format, date only)'),
          labels: z
            .array(z.string())
            .optional()
            .describe('Array of label IDs to apply to the card'),
        },
      },
      async args => {
        try {
          const card = await this.trelloClient.addCard(args.boardId, args);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Update card details
    this.server.registerTool(
      'update_card_details',
      {
        title: 'Update Card Details',
        description: "Update an existing card's details on a specific board",
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          cardId: z.string().describe('ID of the card to update'),
          name: z.string().optional().describe('New name for the card'),
          description: z.string().optional().describe('New description for the card'),
          dueDate: z.string().optional().describe('New due date for the card (ISO 8601 format)'),
          start: z
            .string()
            .optional()
            .describe('New start date for the card (YYYY-MM-DD format, date only)'),
          dueComplete: z
            .boolean()
            .optional()
            .describe('Mark the due date as complete (true) or incomplete (false)'),
          labels: z.array(z.string()).optional().describe('New array of label IDs for the card'),
        },
      },
      async args => {
        try {
          const card = await this.trelloClient.updateCard(args.boardId, args);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Archive a card
    this.server.registerTool(
      'archive_card',
      {
        title: 'Archive Card',
        description: 'Send a card to the archive on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          cardId: z.string().describe('ID of the card to archive'),
        },
      },
      async ({ boardId, cardId }) => {
        try {
          const card = await this.trelloClient.archiveCard(boardId, cardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Move a card
    this.server.registerTool(
      'move_card',
      {
        title: 'Move Card',
        description: 'Move a card to a different list, potentially on a different board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe(
              'ID of the target Trello board (where the listId resides, uses default if not provided)'
            ),
          cardId: z.string().describe('ID of the card to move'),
          listId: z.string().describe('ID of the target list'),
        },
      },
      async ({ boardId, cardId, listId }) => {
        try {
          const card = await this.trelloClient.moveCard(boardId, cardId, listId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Add a new list to a board
    this.server.registerTool(
      'add_list_to_board',
      {
        title: 'Add List to Board',
        description: 'Add a new list to the specified board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          name: z.string().describe('Name of the new list'),
        },
      },
      async ({ boardId, name }) => {
        try {
          const list = await this.trelloClient.addList(boardId, name);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Archive a list
    this.server.registerTool(
      'archive_list',
      {
        title: 'Archive List',
        description: 'Send a list to the archive on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          listId: z.string().describe('ID of the list to archive'),
        },
      },
      async ({ boardId, listId }) => {
        try {
          const list = await this.trelloClient.archiveList(boardId, listId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Update list position
    this.server.registerTool(
      'update_list_position',
      {
        title: 'Update List Position',
        description:
          'Update the position of a list on the board. Trello uses fractional indexing: each list has a float position, and to place a list between two others, use the average of their positions (e.g., between pos 1024 and 2048, use 1536). Use "top"/"bottom" shortcuts to move to the edges.',
        inputSchema: {
          listId: z.string().describe('ID of the list to reposition'),
          position: z
            .string()
            .refine(
              (val) => {
                if (val === 'top' || val === 'bottom') return true;
                const num = Number(val);
                return num > 0 && isFinite(num);
              },
              {
                message: "Position must be 'top', 'bottom', or a positive finite numeric string.",
              }
            )
            .describe(
              'New position: "top" (move to leftmost), "bottom" (move to rightmost), or a numeric string (e.g. "1536"). To place between two lists, use the average of their pos values.'
            ),
        },
      },
      async ({ listId, position }) => {
        try {
          const parsedPosition = position === 'top' || position === 'bottom' ? position : Number(position);
          const list = await this.trelloClient.updateListPosition(listId, parsedPosition);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Get cards assigned to current user
    this.server.registerTool(
      'get_my_cards',
      {
        title: 'Get My Cards',
        description: 'Fetch all cards assigned to the current user',
        inputSchema: {},
      },
      async () => {
        try {
          const cards = await this.trelloClient.getMyCards();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(cards, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Attach image to card (kept for backward compatibility)
    this.server.registerTool(
      'attach_image_to_card',
      {
        title: 'Attach Image to Card',
        description: 'Attach an image to a card from a URL on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe(
              'ID of the Trello board where the card exists (uses default if not provided)'
            ),
          cardId: z.string().describe('ID of the card to attach the image to'),
          imageUrl: z.string().describe('URL of the image to attach'),
          name: z
            .string()
            .optional()
            .default('Image Attachment')
            .describe('Optional name for the attachment (defaults to "Image Attachment")'),
        },
      },
      async ({ boardId, cardId, imageUrl, name }) => {
        try {
          const attachment = await this.trelloClient.attachImageToCard(
            boardId,
            cardId,
            imageUrl,
            name
          );
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(attachment, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Attach file to card (generic file attachment)
    this.server.registerTool(
      'attach_file_to_card',
      {
        title: 'Attach File to Card',
        description: 'Attach any file to a card from a URL on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe(
              'ID of the Trello board where the card exists (uses default if not provided)'
            ),
          cardId: z.string().describe('ID of the card to attach the file to'),
          fileUrl: z.string().describe('URL of the file to attach'),
          name: z
            .string()
            .optional()
            .default('File Attachment')
            .describe('Optional name for the attachment (defaults to "File Attachment")'),
          mimeType: z
            .string()
            .optional()
            .describe(
              'Optional MIME type of the file (e.g., "application/pdf", "text/plain", "video/mp4")'
            ),
        },
      },
      async ({ boardId, cardId, fileUrl, name, mimeType }) => {
        try {
          const attachment = await this.trelloClient.attachFileToCard(
            boardId,
            cardId,
            fileUrl,
            name,
            mimeType
          );
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(attachment, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Attach image data to card (for base64/data URL uploads)
    this.server.registerTool(
      'attach_image_data_to_card',
      {
        title: 'Attach Image Data to Card',
        description: 'Attach an image to a card from base64 data or data URL (for screenshot uploads)',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe(
              'ID of the Trello board where the card exists (uses default if not provided)'
            ),
          cardId: z.string().describe('ID of the card to attach the image to'),
          imageData: z.string().describe('Base64 encoded image data or data URL (e.g., data:image/png;base64,...)'),
          name: z
            .string()
            .optional()
            .describe('Optional name for the attachment'),
          mimeType: z
            .string()
            .optional()
            .default('image/png')
            .describe('Optional MIME type (default: image/png)'),
        },
      },
      async ({ boardId, cardId, imageData, name, mimeType }) => {
        try {
          const attachment = await this.trelloClient.attachImageDataToCard(
            boardId,
            cardId,
            imageData,
            name,
            mimeType
          );
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(attachment, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // List all boards
    this.server.registerTool(
      'list_boards',
      {
        title: 'List Boards',
        description: 'List all boards the user has access to',
        inputSchema: {},
      },
      async () => {
        try {
          const boards = await this.trelloClient.listBoards();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(boards, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Set active board
    this.server.registerTool(
      'set_active_board',
      {
        title: 'Set Active Board',
        description: 'Set the active board for future operations',
        inputSchema: {
          boardId: z.string().describe('ID of the board to set as active'),
        },
      },
      async ({ boardId }) => {
        try {
          const board = await this.trelloClient.setActiveBoard(boardId);
          return {
            content: [
              {
                type: 'text' as const,
                text: `Successfully set active board to "${board.name}" (${board.id})`,
              },
            ],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // List workspaces
    this.server.registerTool(
      'list_workspaces',
      {
        title: 'List Workspaces',
        description: 'List all workspaces the user has access to',
        inputSchema: {},
      },
      async () => {
        try {
          const workspaces = await this.trelloClient.listWorkspaces();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(workspaces, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Create a new board
    this.server.registerTool(
      'create_board',
      {
        title: 'Create Board',
        description: 'Create a new Trello board optionally within a workspace',
        inputSchema: {
          name: z.string().describe('Name of the board'),
          desc: z.string().optional().describe('Description of the board'),
          idOrganization: z
            .string()
            .min(1)
            .optional()
            .describe('Workspace ID to create the board in (uses active if not provided)'),
          defaultLabels: z
            .boolean()
            .optional()
            .default(true)
            .describe('Create default labels (true by default)'),
          defaultLists: z
            .boolean()
            .optional()
            .default(true)
            .describe('Create default lists (true by default)'),
        },
      },
      async ({ name, desc, idOrganization, defaultLabels, defaultLists }) => {
        try {
          const board = await this.trelloClient.createBoard({
            name,
            desc,
            idOrganization,
            defaultLabels,
            defaultLists,
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(board, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Set active workspace
    this.server.registerTool(
      'set_active_workspace',
      {
        title: 'Set Active Workspace',
        description: 'Set the active workspace for future operations',
        inputSchema: {
          workspaceId: z.string().describe('ID of the workspace to set as active'),
        },
      },
      async ({ workspaceId }) => {
        try {
          const workspace = await this.trelloClient.setActiveWorkspace(workspaceId);
          return {
            content: [
              {
                type: 'text' as const,
                text: `Successfully set active workspace to "${workspace.displayName}" (${workspace.id})`,
              },
            ],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // List boards in workspace
    this.server.registerTool(
      'list_boards_in_workspace',
      {
        title: 'List Boards in Workspace',
        description: 'List all boards in a specific workspace',
        inputSchema: {
          workspaceId: z.string().describe('ID of the workspace to list boards from'),
        },
      },
      async ({ workspaceId }) => {
        try {
          const boards = await this.trelloClient.listBoardsInWorkspace(workspaceId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(boards, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Get active board info
    this.server.registerTool(
      'get_active_board_info',
      {
        title: 'Get Active Board Info',
        description: 'Get information about the currently active board',
        inputSchema: {},
      },
      async () => {
        try {
          const boardId = this.trelloClient.activeBoardId;
          if (!boardId) {
            return {
              content: [{ type: 'text' as const, text: 'No active board set' }],
              isError: true,
            };
          }
          const board = await this.trelloClient.getBoardById(boardId);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    ...board,
                    isActive: true,
                    activeWorkspaceId: this.trelloClient.activeWorkspaceId || 'Not set',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Get card details
    this.server.registerTool(
      'get_card',
      {
        title: 'Get Card',
        description: 'Get detailed information about a specific Trello card',
        inputSchema: {
          cardId: z.string().describe('ID of the card to fetch'),
          includeMarkdown: z
            .boolean()
            .optional()
            .default(false)
            .describe('Whether to return card description in markdown format (default: false)'),
        },
      },
      async ({ cardId, includeMarkdown }) => {
        try {
          const card = await this.trelloClient.getCard(cardId, includeMarkdown);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Add a comment to a card
    this.server.registerTool(
      'add_comment',
      {
        title: 'Add Comment to Card',
        description: 'Add the given text as a new comment to the given card',
        inputSchema: {
          cardId: z.string().describe('ID of the card to comment on'),
          text: z.string().describe('The text of the comment to add'),
        },
      },
      async ({ cardId, text }) => {
        try {
          const comment = await this.trelloClient.addCommentToCard(cardId, text);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(comment, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Update a comment to a card
    this.server.registerTool(
      'update_comment',
      {
        title: 'Update Comment on Card',
        description: 'Update the given comment with the new text',
        inputSchema: {
          commentId: z.string().describe('ID of the comment to change'),
          text: z.string().describe('The new text of the comment'),
        },
      },
      async ({ commentId, text }) => {
        try {
          const success = await this.trelloClient.updateCommentOnCard(commentId, text);
          return {
            content: [{ type: 'text' as const, text: success ? 'success' : 'failure' }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Delete a comment from a card
    this.server.registerTool(
      'delete_comment',
      {
        title: 'Delete Comment from Card',
        description: 'Delete a comment from a Trello card',
        inputSchema: {
          commentId: z.string().describe('ID of the comment to delete'),
        },
      },
      async ({ commentId }) => {
        try {
          const success = await this.trelloClient.deleteCommentFromCard(commentId);
          return {
            content: [{ type: 'text' as const, text: success ? 'success' : 'failure' }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Get comments from a card
    this.server.registerTool(
      'get_card_comments',
      {
        title: 'Get Card Comments',
        description: 'Retrieve all comments from a specific Trello card',
        inputSchema: {
          cardId: z.string().describe('ID of the card to get comments from'),
          limit: z
            .number()
            .optional()
            .default(100)
            .describe('Maximum number of comments to retrieve (default: 100)'),
        },
      },
      async ({ cardId, limit }) => {
        try {
          const comments = await this.trelloClient.getCardComments(cardId, limit);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(comments, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Checklist tools
    this.server.registerTool(
      'create_checklist',
      {
        title: 'Create Checklist',
        description: 'Create a new checklist',
        inputSchema: {
          name: z.string().describe('Name of the checklist to create'),
          cardId: z.string().describe('ID of the Trello card'),
        },
      },
      async ({ name, cardId }) => {
        try {
          const items = await this.trelloClient.createChecklist(name, cardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Checklist tools
    this.server.registerTool(
      'get_checklist_items',
      {
        title: 'Get Checklist Items',
        description: 'Get all items from a checklist by name',
        inputSchema: {
          name: z.string().describe('Name of the checklist to retrieve items from'),
          cardId: z
            .string()
            .optional()
            .describe('ID of the card to scope checklist search to (recommended to avoid ambiguity)'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ name, cardId, boardId }) => {
        try {
          const items = await this.trelloClient.getChecklistItems(name, cardId, boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'add_checklist_item',
      {
        title: 'Add Checklist Item',
        description: 'Add a new item to a checklist',
        inputSchema: {
          text: z.string().describe('Text content of the checklist item'),
          checkListName: z.string().describe('Name of the checklist to add the item to'),
          cardId: z
            .string()
            .optional()
            .describe('ID of the card to scope checklist search to (recommended to avoid ambiguity)'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ text, checkListName, cardId, boardId }) => {
        try {
          const item = await this.trelloClient.addChecklistItem(text, checkListName, cardId, boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(item, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'find_checklist_items_by_description',
      {
        title: 'Find Checklist Items by Description',
        description: 'Search for checklist items containing specific text in their description',
        inputSchema: {
          description: z.string().describe('Text to search for in checklist item descriptions'),
          cardId: z
            .string()
            .optional()
            .describe('ID of the card to scope checklist search to (recommended to avoid ambiguity)'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ description, cardId, boardId }) => {
        try {
          const items = await this.trelloClient.findChecklistItemsByDescription(
            description,
            cardId,
            boardId
          );
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'get_acceptance_criteria',
      {
        title: 'Get Acceptance Criteria',
        description: 'Get all items from the "Acceptance Criteria" checklist',
        inputSchema: {
          cardId: z
            .string()
            .optional()
            .describe('ID of the card to scope checklist search to (recommended to avoid ambiguity)'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ cardId, boardId }) => {
        try {
          const items = await this.trelloClient.getAcceptanceCriteria(cardId, boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'get_checklist_by_name',
      {
        title: 'Get Checklist by Name',
        description: 'Get a complete checklist with all its items and completion percentage',
        inputSchema: {
          name: z.string().describe('Name of the checklist to retrieve'),
          cardId: z
            .string()
            .optional()
            .describe('ID of the card to scope checklist search to (recommended to avoid ambiguity)'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ name, cardId, boardId }) => {
        try {
          const checklist = await this.trelloClient.getChecklistByName(name, cardId, boardId);
          if (!checklist) {
            return {
              content: [{ type: 'text' as const, text: `Checklist "${name}" not found` }],
              isError: true,
            };
          }
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(checklist, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'update_checklist_item',
      {
        title: 'Update Checklist Item',
        description: 'Update a checklist item state (mark as complete or incomplete)',
        inputSchema: {
          cardId: z.string().describe('ID of the card containing the checklist item'),
          checkItemId: z.string().describe('ID of the checklist item to update'),
          state: z
            .enum(['complete', 'incomplete'])
            .describe('New state for the checklist item'),
        },
      },
      async ({ cardId, checkItemId, state }) => {
        try {
          const item = await this.trelloClient.updateChecklistItem(cardId, checkItemId, state);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(item, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Member management tools
    this.server.registerTool(
      'get_board_members',
      {
        title: 'Get Board Members',
        description: 'Get all members of a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ boardId }) => {
        try {
          const members = await this.trelloClient.getBoardMembers(boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(members, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'assign_member_to_card',
      {
        title: 'Assign Member to Card',
        description: 'Assign a member to a specific card',
        inputSchema: {
          cardId: z.string().describe('ID of the card to assign the member to'),
          memberId: z.string().describe('ID of the member to assign to the card'),
        },
      },
      async ({ cardId, memberId }) => {
        try {
          const card = await this.trelloClient.assignMemberToCard(cardId, memberId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'remove_member_from_card',
      {
        title: 'Remove Member from Card',
        description: 'Remove a member from a specific card',
        inputSchema: {
          cardId: z.string().describe('ID of the card to remove the member from'),
          memberId: z.string().describe('ID of the member to remove from the card'),
        },
      },
      async ({ cardId, memberId }) => {
        try {
          const card = await this.trelloClient.removeMemberFromCard(cardId, memberId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Label management tools
    this.server.registerTool(
      'get_board_labels',
      {
        title: 'Get Board Labels',
        description: 'Get all labels of a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ boardId }) => {
        try {
          const labels = await this.trelloClient.getBoardLabels(boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(labels, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'create_label',
      {
        title: 'Create Label',
        description: 'Create a new label on a board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          name: z.string().describe('Name of the label'),
          color: z
            .string()
            .optional()
            .describe(
              'Color of the label (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "sky", "lime", "black", "null")'
            ),
        },
      },
      async ({ boardId, name, color }) => {
        try {
          const label = await this.trelloClient.createLabel(boardId, name, color);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(label, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'update_label',
      {
        title: 'Update Label',
        description: 'Update an existing label',
        inputSchema: {
          labelId: z.string().describe('ID of the label to update'),
          name: z.string().optional().describe('New name for the label'),
          color: z.string().optional().describe('New color for the label'),
        },
      },
      async ({ labelId, name, color }) => {
        try {
          const label = await this.trelloClient.updateLabel(labelId, name, color);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(label, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    this.server.registerTool(
      'delete_label',
      {
        title: 'Delete Label',
        description: 'Delete a label from a board',
        inputSchema: {
          labelId: z.string().describe('ID of the label to delete'),
        },
      },
      async ({ labelId }) => {
        try {
          await this.trelloClient.deleteLabel(labelId);
          return {
            content: [{ type: 'text' as const, text: 'Label deleted successfully' }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Card history tool
    this.server.registerTool(
      'get_card_history',
      {
        title: 'Get Card History',
        description: 'Get the history/actions of a specific card',
        inputSchema: {
          cardId: z.string().describe('ID of the card to get history for'),
          filter: z
            .string()
            .optional()
            .describe(
              'Optional: Filter actions by type (e.g., "all", "updateCard:idList", "addAttachmentToCard", "commentCard", "updateCard:name", "updateCard:desc", "updateCard:due", "addMemberToCard", "removeMemberFromCard", "addLabelToCard", "removeLabelFromCard")'
            ),
          limit: z
            .number()
            .optional()
            .describe('Optional: Number of actions to fetch (default: all)'),
        },
      },
      async ({ cardId, filter, limit }) => {
        try {
          const history = await this.trelloClient.getCardHistory(cardId, filter, limit);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(history, null, 2) }],
          };
        } catch (error) {
          return this.handleError(error);
        }
      }
    );
  }

  private setupHealthEndpoints() {
    // Basic health check endpoint
    this.server.registerTool('get_health', HealthEndpointSchemas.basicHealth, async () => {
      try {
        return await this.healthEndpoints.getBasicHealth();
      } catch (error) {
        return this.handleError(error);
      }
    });

    // Detailed health diagnostic endpoint
    this.server.registerTool(
      'get_health_detailed',
      HealthEndpointSchemas.detailedHealth,
      async () => {
        try {
          return await this.healthEndpoints.getDetailedHealth();
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Metadata consistency check endpoint
    this.server.registerTool(
      'get_health_metadata',
      HealthEndpointSchemas.metadataHealth,
      async () => {
        try {
          return await this.healthEndpoints.getMetadataHealth();
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // Performance metrics endpoint
    this.server.registerTool(
      'get_health_performance',
      HealthEndpointSchemas.performanceHealth,
      async () => {
        try {
          return await this.healthEndpoints.getPerformanceHealth();
        } catch (error) {
          return this.handleError(error);
        }
      }
    );

    // System repair endpoint
    this.server.registerTool('perform_system_repair', HealthEndpointSchemas.repair, async () => {
      try {
        return await this.healthEndpoints.performRepair();
      } catch (error) {
        return this.handleError(error);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    // Load configuration before starting the server
    await this.trelloClient.loadConfig().catch(() => {
      // Continue with default config if loading fails
    });
    await this.server.connect(transport);
  }
}

const server = new TrelloServer();
server.run().catch(() => {
  // Silently handle errors to avoid interfering with MCP protocol
});
