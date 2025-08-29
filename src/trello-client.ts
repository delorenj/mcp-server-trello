import axios, { AxiosInstance } from 'axios';
import {
  TrelloConfig,
  TrelloCard,
  TrelloList,
  TrelloAction,
  TrelloAttachment,
  TrelloBoard,
  TrelloWorkspace,
  EnhancedTrelloCard,
  TrelloChecklist,
  TrelloCheckItem,
  CheckList,
  CheckListItem,
} from './types.js';
import { createTrelloRateLimiters } from './rate-limiter.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Path for storing active board/workspace configuration
const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.trello-mcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class TrelloClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter;
  private defaultBoardId?: string;
  private activeConfig: TrelloConfig;

  constructor(private config: TrelloConfig) {
    this.defaultBoardId = config.defaultBoardId;
    this.activeConfig = { ...config };
    // If boardId is provided in config, use it as the active board
    if (config.boardId && !this.activeConfig.boardId) {
      this.activeConfig.boardId = config.boardId;
    }
    // If defaultBoardId is provided but boardId is not, use defaultBoardId
    if (this.defaultBoardId && !this.activeConfig.boardId) {
      this.activeConfig.boardId = this.defaultBoardId;
    }
    this.axiosInstance = axios.create({
      baseURL: 'https://api.trello.com/1',
      params: {
        key: config.apiKey,
        token: config.token,
      },
    });

    this.rateLimiter = createTrelloRateLimiters();

    // Add rate limiting interceptor
    this.axiosInstance.interceptors.request.use(async config => {
      await this.rateLimiter.waitForAvailableToken();
      return config;
    });
  }

  /**
   * Load saved configuration from disk
   */
  public async loadConfig(): Promise<void> {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      const savedConfig = JSON.parse(data);

      // Only update boardId and workspaceId, keep credentials from env
      if (savedConfig.boardId) {
        this.activeConfig.boardId = savedConfig.boardId;
      }
      if (savedConfig.workspaceId) {
        this.activeConfig.workspaceId = savedConfig.workspaceId;
      }
    } catch (error) {
      // File might not exist yet, that's okay
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Save current configuration to disk
   */
  private async saveConfig(): Promise<void> {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const configToSave = {
        boardId: this.activeConfig.boardId,
        workspaceId: this.activeConfig.workspaceId,
      };
      await fs.writeFile(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
    } catch (error) {
      // Failed to save configuration
      throw new Error('Failed to save configuration');
    }
  }

  /**
   * Get the current active board ID
   */
  get activeBoardId(): string | undefined {
    return this.activeConfig.boardId;
  }

  /**
   * Get the current active workspace ID
   */
  get activeWorkspaceId(): string | undefined {
    return this.activeConfig.workspaceId;
  }

  /**
   * Set the active board
   */
  async setActiveBoard(boardId: string): Promise<TrelloBoard> {
    // Verify the board exists
    const board = await this.getBoardById(boardId);
    this.activeConfig.boardId = boardId;
    await this.saveConfig();
    return board;
  }

  /**
   * Set the active workspace
   */
  async setActiveWorkspace(workspaceId: string): Promise<TrelloWorkspace> {
    // Verify the workspace exists
    const workspace = await this.getWorkspaceById(workspaceId);
    this.activeConfig.workspaceId = workspaceId;
    await this.saveConfig();
    return workspace;
  }

  private async handleRequest<T = any>(requestFn: () => Promise<T>): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          // Rate limit exceeded, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.handleRequest(requestFn);
        }
        // Trello API Error
        // Customize error handling based on Trello's error structure if needed
        throw new McpError(
          ErrorCode.InternalError,
          `Trello API Error: ${error.response?.status} ${error.message}`,
          error.response?.data
        );
      } else {
        // Unexpected Error
        throw new McpError(ErrorCode.InternalError, 'An unexpected error occurred');
      }
    }
  }

  /**
   * List all boards the user has access to
   */
  async listBoards(): Promise<TrelloBoard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/members/me/boards');
      return response.data;
    });
  }

  /**
   * Get a specific board by ID
   */
  async getBoardById(boardId: string): Promise<TrelloBoard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${boardId}`);
      return response.data;
    });
  }

  /**
   * List all workspaces the user has access to
   */
  async listWorkspaces(): Promise<TrelloWorkspace[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/members/me/organizations');
      return response.data;
    });
  }

  /**
   * Get a specific workspace by ID
   */
  async getWorkspaceById(workspaceId: string): Promise<TrelloWorkspace> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/organizations/${workspaceId}`);
      return response.data;
    });
  }

  /**
   * List boards in a specific workspace
   */
  async listBoardsInWorkspace(workspaceId: string): Promise<TrelloBoard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/organizations/${workspaceId}/boards`);
      return response.data;
    });
  }

  async getCardsByList(boardId: string | undefined, listId: string): Promise<TrelloCard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/lists/${listId}/cards`);
      return response.data;
    });
  }

  async getLists(boardId?: string): Promise<TrelloList[]> {
    const effectiveBoardId = boardId || this.activeConfig.boardId || this.defaultBoardId;
    if (!effectiveBoardId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'boardId is required when no default board is configured'
      );
    }
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${effectiveBoardId}/lists`);
      return response.data;
    });
  }

  async getRecentActivity(boardId?: string, limit: number = 10): Promise<TrelloAction[]> {
    const effectiveBoardId = boardId || this.activeConfig.boardId || this.defaultBoardId;
    if (!effectiveBoardId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'boardId is required when no default board is configured'
      );
    }
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${effectiveBoardId}/actions`, {
        params: { limit },
      });
      return response.data;
    });
  }

  async addCard(
    boardId: string | undefined,
    params: {
      listId: string;
      name: string;
      description?: string;
      dueDate?: string;
      start?: string;
      labels?: string[];
    }
  ): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/cards', {
        idList: params.listId,
        name: params.name,
        desc: params.description,
        due: params.dueDate,
        start: params.start,
        idLabels: params.labels,
      });
      return response.data;
    });
  }

  async updateCard(
    boardId: string | undefined,
    params: {
      cardId: string;
      name?: string;
      description?: string;
      dueDate?: string;
      start?: string;
      dueComplete?: boolean;
      labels?: string[];
    }
  ): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${params.cardId}`, {
        name: params.name,
        desc: params.description,
        due: params.dueDate,
        start: params.start,
        dueComplete: params.dueComplete,
        idLabels: params.labels,
      });
      return response.data;
    });
  }

  async archiveCard(boardId: string | undefined, cardId: string): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        closed: true,
      });
      return response.data;
    });
  }

  async moveCard(boardId: string | undefined, cardId: string, listId: string): Promise<TrelloCard> {
    const effectiveBoardId = boardId || this.defaultBoardId;
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        idList: listId,
        ...(effectiveBoardId && { idBoard: effectiveBoardId }),
      });
      return response.data;
    });
  }

  async addList(boardId: string | undefined, name: string): Promise<TrelloList> {
    const effectiveBoardId = boardId || this.activeConfig.boardId || this.defaultBoardId;
    if (!effectiveBoardId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'boardId is required when no default board is configured'
      );
    }
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/lists', {
        name,
        idBoard: effectiveBoardId,
      });
      return response.data;
    });
  }

  async archiveList(boardId: string | undefined, listId: string): Promise<TrelloList> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/lists/${listId}/closed`, {
        value: true,
      });
      return response.data;
    });
  }

  async getMyCards(): Promise<TrelloCard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/members/me/cards');
      return response.data;
    });
  }

  async attachImageToCard(
    boardId: string | undefined,
    cardId: string,
    imageUrl: string,
    name?: string
  ): Promise<TrelloAttachment> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post(`/cards/${cardId}/attachments`, {
        url: imageUrl,
        name: name || 'Image Attachment',
      });
      return response.data;
    });
  }

  async getCard(
    cardId: string,
    includeMarkdown: boolean = false
  ): Promise<EnhancedTrelloCard | string> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/cards/${cardId}`, {
        params: {
          attachments: true,
          checklists: 'all',
          checkItemStates: true,
          members: true,
          membersVoted: true,
          labels: true,
          actions: 'commentCard',
          actions_limit: 100,
          fields: 'all',
          customFieldItems: true,
          list: true,
          board: true,
          stickers: true,
          pluginData: true,
        },
      });

      const cardData: EnhancedTrelloCard = response.data;

      if (includeMarkdown) {
        return this.formatCardAsMarkdown(cardData);
      }

      return cardData;
    });
  }

  // Checklist methods
  async getChecklistItems(name: string, boardId?: string): Promise<CheckListItem[]> {
    const effectiveBoardId = boardId || this.activeConfig.boardId;
    if (!effectiveBoardId) {
      throw new McpError(ErrorCode.InvalidParams, 'No board ID provided and no active board set');
    }

    // Get all checklists from the board directly
    const response = await this.axiosInstance.get<TrelloChecklist[]>(
      `/boards/${effectiveBoardId}/checklists`
    );

    const allCheckItems: CheckListItem[] = [];

    for (const checklist of response.data) {
      if (checklist.name.toLowerCase() === name.toLowerCase()) {
        const convertedItems = checklist.checkItems.map(item =>
          this.convertToCheckListItem(item, checklist.id)
        );
        allCheckItems.push(...convertedItems);
      }
    }

    return allCheckItems;
  }

  async addChecklistItem(text: string, checkListName: string, boardId?: string): Promise<CheckListItem> {
    const effectiveBoardId = boardId || this.activeConfig.boardId;
    if (!effectiveBoardId) {
      throw new McpError(ErrorCode.InvalidParams, 'No board ID provided and no active board set');
    }

    // Find the checklist by name using the more efficient endpoint
    const checklistsResponse = await this.axiosInstance.get<TrelloChecklist[]>(
      `/boards/${effectiveBoardId}/checklists`
    );
    const checklists = checklistsResponse.data;

    const targetChecklist = checklists.find(
      checklist => checklist.name.toLowerCase() === checkListName.toLowerCase()
    );

    if (!targetChecklist) {
      throw new McpError(ErrorCode.InvalidParams, `Checklist "${checkListName}" not found`);
    }

    // Add the check item to the checklist
    const itemResponse = await this.axiosInstance.post<TrelloCheckItem>(
      `/checklists/${targetChecklist.id}/checkItems`,
      {
        name: text,
      }
    );

    return this.convertToCheckListItem(itemResponse.data, targetChecklist.id);
  }

  async findChecklistItemsByDescription(description: string, boardId?: string): Promise<CheckListItem[]> {
    const effectiveBoardId = boardId || this.activeConfig.boardId;
    if (!effectiveBoardId) {
      throw new McpError(ErrorCode.InvalidParams, 'No board ID provided and no active board set');
    }

    // Get all checklists from the board directly
    const response = await this.axiosInstance.get<TrelloChecklist[]>(
      `/boards/${effectiveBoardId}/checklists`
    );

    const matchingItems: CheckListItem[] = [];
    const searchTerm = description.toLowerCase();
    
    for (const checklist of response.data) {
      for (const checkItem of checklist.checkItems) {
        if (checkItem.name.toLowerCase().includes(searchTerm)) {
          matchingItems.push(this.convertToCheckListItem(checkItem, checklist.id));
        }
      }
    }

    return matchingItems;
  }

  async getAcceptanceCriteria(boardId?: string): Promise<CheckListItem[]> {
    return this.getChecklistItems('Acceptance Criteria', boardId);
  }

  async getChecklistByName(name: string, boardId?: string): Promise<CheckList | null> {
    const effectiveBoardId = boardId || this.activeConfig.boardId;
    if (!effectiveBoardId) {
      throw new McpError(ErrorCode.InvalidParams, 'No board ID provided and no active board set');
    }

    // Get all checklists from the board directly
    const response = await this.axiosInstance.get<TrelloChecklist[]>(
      `/boards/${effectiveBoardId}/checklists`
    );

    const targetChecklist = response.data.find(
      checklist => checklist.name.toLowerCase() === name.toLowerCase()
    );

    if (targetChecklist) {
      return this.convertToCheckList(targetChecklist);
    }

    return null;
  }

  private formatCardAsMarkdown(card: EnhancedTrelloCard): string {
    let markdown = '';

    // Title and basic info
    markdown += `# ${card.name}\n\n`;

    // Board and List context
    if (card.board && card.list) {
      markdown += `📍 **Board**: [${card.board.name}](${card.board.url}) > **List**: ${card.list.name}\n\n`;
    }

    // Labels
    if (card.labels && card.labels.length > 0) {
      markdown += `## 🏷️ Labels\n`;
      card.labels.forEach(label => {
        markdown += `- \`${label.color}\` ${label.name || '(no name)'}\n`;
      });
      markdown += '\n';
    }

    // Due date
    if (card.due) {
      const dueDate = new Date(card.due);
      const status = card.dueComplete ? '✅ Complete' : '⏰ Due';
      markdown += `## 📅 Due Date\n${status}: ${dueDate.toLocaleString()}\n\n`;
    }

    // Members
    if (card.members && card.members.length > 0) {
      markdown += `## 👥 Members\n`;
      card.members.forEach(member => {
        markdown += `- @${member.username} (${member.fullName})\n`;
      });
      markdown += '\n';
    }

    // Description
    if (card.desc) {
      markdown += `## 📝 Description\n`;
      markdown += `${card.desc}\n\n`;

      // Parse for inline images (Trello uses markdown-like syntax)
      // Look for patterns like ![alt text](image url)
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const images = card.desc.match(imageRegex);
      if (images) {
        markdown += `### Inline Images in Description\n`;
        images.forEach((img, index) => {
          const match = img.match(/!\[([^\]]*)\]\(([^)]+)\)/);
          if (match) {
            markdown += `${index + 1}. ${match[1] || 'Image'}: ${match[2]}\n`;
          }
        });
        markdown += '\n';
      }
    }

    // Checklists
    if (card.checklists && card.checklists.length > 0) {
      markdown += `## ✅ Checklists\n`;
      card.checklists.forEach(checklist => {
        const completed = checklist.checkItems.filter(item => item.state === 'complete').length;
        const total = checklist.checkItems.length;
        markdown += `### ${checklist.name} (${completed}/${total})\n`;

        // Sort by position
        const sortedItems = [...checklist.checkItems].sort((a, b) => a.pos - b.pos);

        sortedItems.forEach(item => {
          const checkbox = item.state === 'complete' ? '[x]' : '[ ]';
          markdown += `- ${checkbox} ${item.name}`;
          if (item.due) {
            const itemDue = new Date(item.due);
            markdown += ` (Due: ${itemDue.toLocaleDateString()})`;
          }
          if (item.idMember) {
            const member = card.members?.find(m => m.id === item.idMember);
            if (member) {
              markdown += ` - @${member.username}`;
            }
          }
          markdown += '\n';
        });
        markdown += '\n';
      });
    }

    // Attachments
    if (card.attachments && card.attachments.length > 0) {
      markdown += `## 📎 Attachments (${card.attachments.length})\n`;
      card.attachments.forEach((attachment, index) => {
        markdown += `### ${index + 1}. ${attachment.name}\n`;
        markdown += `- **URL**: ${attachment.url}\n`;
        if (attachment.fileName) {
          markdown += `- **File**: ${attachment.fileName}`;
          if (attachment.bytes) {
            const size = this.formatFileSize(attachment.bytes);
            markdown += ` (${size})`;
          }
          markdown += '\n';
        }
        if (attachment.mimeType) {
          markdown += `- **Type**: ${attachment.mimeType}\n`;
        }
        markdown += `- **Added**: ${new Date(attachment.date).toLocaleString()}\n`;

        // Image preview
        if (attachment.previews && attachment.previews.length > 0) {
          const preview = attachment.previews[0];
          markdown += `- **Preview**: ![${attachment.name}](${preview.url})\n`;
        }
        markdown += '\n';
      });
    }

    // Comments
    if (card.comments && card.comments.length > 0) {
      markdown += `## 💬 Comments (${card.comments.length})\n`;
      card.comments.forEach(comment => {
        const date = new Date(comment.date);
        markdown += `### ${comment.memberCreator.fullName} (@${comment.memberCreator.username}) - ${date.toLocaleString()}\n`;
        markdown += `${comment.data.text}\n\n`;
      });
    }

    // Statistics
    if (card.badges) {
      markdown += `## 📊 Statistics\n`;
      if (card.badges.checkItems > 0) {
        markdown += `- **Checklist Items**: ${card.badges.checkItemsChecked}/${card.badges.checkItems} completed\n`;
      }
      if (card.badges.comments > 0) {
        markdown += `- **Comments**: ${card.badges.comments}\n`;
      }
      if (card.badges.attachments > 0) {
        markdown += `- **Attachments**: ${card.badges.attachments}\n`;
      }
      if (card.badges.votes > 0) {
        markdown += `- **Votes**: ${card.badges.votes}\n`;
      }
      markdown += '\n';
    }

    // Links
    markdown += `## 🔗 Links\n`;
    markdown += `- **Card URL**: ${card.url}\n`;
    markdown += `- **Short URL**: ${card.shortUrl}\n\n`;

    // Metadata
    markdown += `---\n`;
    markdown += `*Last Activity: ${new Date(card.dateLastActivity).toLocaleString()}*\n`;
    markdown += `*Card ID: ${card.id}*\n`;

    return markdown;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Helper methods to convert between Trello types and MCP types
  private convertToCheckListItem(trelloItem: TrelloCheckItem, parentCheckListId: string): CheckListItem {
    return {
      id: trelloItem.id,
      text: trelloItem.name,
      complete: trelloItem.state === 'complete',
      parentCheckListId,
    };
  }

  private convertToCheckList(trelloChecklist: TrelloChecklist): CheckList {
    const completedItems = trelloChecklist.checkItems.filter(item => item.state === 'complete').length;
    const totalItems = trelloChecklist.checkItems.length;
    const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      id: trelloChecklist.id,
      name: trelloChecklist.name,
      items: trelloChecklist.checkItems.map(item => this.convertToCheckListItem(item, trelloChecklist.id)),
      percentComplete,
    };
  }
}
