import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
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
  TrelloComment,
  TrelloMember,
  TrelloLabelDetails,
} from './types.js';
import { createTrelloRateLimiters } from './rate-limiter.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';

// Path for storing active board/workspace configuration
const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.trello-mcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

type TrelloRequestReturn =
  | TrelloAction
  | TrelloAttachment
  | TrelloBoard
  | TrelloCard
  | TrelloCheckItem
  | TrelloChecklist
  | TrelloComment
  | EnhancedTrelloCard
  | string
  | boolean
  | TrelloList
  | TrelloWorkspace;

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

  private async handleRequest<T extends TrelloRequestReturn>(
    requestFn: () => Promise<T>
  ): Promise<T> {
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

  /**
   * Create a new board
   */
  async createBoard(params: {
    name: string;
    desc?: string;
    idOrganization?: string;
    defaultLabels?: boolean;
    defaultLists?: boolean;
  }): Promise<TrelloBoard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/boards', {
        name: params.name,
        desc: params.desc,
        idOrganization: params.idOrganization ?? this.activeConfig.workspaceId,
        defaultLabels: params.defaultLabels,
        defaultLists: params.defaultLists,
      });
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

  async updateListPosition(
    listId: string,
    position: string | number
  ): Promise<TrelloList> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/lists/${listId}/pos`, {
        value: position,
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
    // Simply delegate to attachFileToCard - it will auto-detect MIME type for images
    return this.attachFileToCard(boardId, cardId, imageUrl, name || 'Image Attachment', undefined);
  }

  async attachImageDataToCard(
    boardId: string | undefined,
    cardId: string,
    imageData: string,
    name?: string,
    mimeType?: string
  ): Promise<TrelloAttachment> {
    return this.handleRequest(async () => {
      // Convert base64 or data URL to buffer
      let buffer: Buffer;
      let effectiveMimeType = mimeType || 'image/png';

      if (imageData.startsWith('data:')) {
        // Extract mime type and base64 data from data URL
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          effectiveMimeType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          throw new McpError(ErrorCode.InvalidRequest, 'Invalid data URL format');
        }
      } else {
        // Assume it's raw base64
        buffer = Buffer.from(imageData, 'base64');
      }

      // Create form data for multipart upload
      const form = new FormData();
      const fileName = name || `screenshot-${Date.now()}.png`;

      form.append('file', buffer, {
        filename: fileName,
        contentType: effectiveMimeType,
      });

      form.append('name', fileName);
      form.append('mimeType', effectiveMimeType);

      // Upload file directly to Trello
      const response = await this.axiosInstance.post(`/cards/${cardId}/attachments`, form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      return response.data;
    });
  }

  async attachFileToCard(
    boardId: string | undefined,
    cardId: string,
    fileUrl: string,
    name?: string,
    mimeType?: string
  ): Promise<TrelloAttachment> {
    return this.handleRequest(async () => {
      // Check if fileUrl is a local file path (starts with file://)
      if (fileUrl.startsWith('file://')) {
        // Handle local file upload
        const localPath = fileURLToPath(fileUrl);
        let effectiveMimeType = mimeType;
        if (!effectiveMimeType) {
          const ext = path.extname(localPath).toLowerCase();
          effectiveMimeType = MIME_TYPES[ext] || 'application/octet-stream';
        }

        // Check if file exists
        try {
          await fs.access(localPath);
        } catch (error) {
          throw new McpError(ErrorCode.InvalidRequest, `File not found: ${localPath}`);
        }

        // Create form data for multipart upload
        const form = new FormData();
        const fileStream = createReadStream(localPath);
        const fileName = name || path.basename(localPath);

        form.append('file', fileStream, {
          filename: fileName,
          contentType: effectiveMimeType,
        });

        // Add name and mimeType to form
        form.append('name', fileName);
        form.append('mimeType', effectiveMimeType);

        // Upload file directly to Trello using the configured axios instance
        const response = await this.axiosInstance.post(`/cards/${cardId}/attachments`, form, {
          headers: {
            ...form.getHeaders(),
          },
        });

        return response.data;
      } else {
        // Handle URL attachment
        const remoteUrlPath = new URL(fileUrl).pathname;
        let effectiveMimeType = mimeType;
        if (!effectiveMimeType) {
          const ext = path.extname(remoteUrlPath).toLowerCase();
          effectiveMimeType = MIME_TYPES[ext] || 'application/octet-stream';
        }

        const response = await this.axiosInstance.post(`/cards/${cardId}/attachments`, {
          url: fileUrl,
          name: name || 'File Attachment',
          mimeType: effectiveMimeType,
        });
        return response.data;
      }
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

  // Add Comment on Card
  async addCommentToCard(cardId: string, text: string): Promise<TrelloComment> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post(
        `cards/${cardId}/actions/comments?text=${encodeURIComponent(text)}`
      );
      return response.data;
    });
  }

  // Update Comment
  async updateCommentOnCard(commentId: string, text: string): Promise<boolean> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(
        `/actions/${commentId}?text=${encodeURIComponent(text)}`
      );
      if (response.status !== 200) {
        return false;
      }
      return true;
    });
  }

  // Delete Comment
  async deleteCommentFromCard(commentId: string): Promise<boolean> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.delete(`/actions/${commentId}`);
      return response.status === 200;
    });
  }

  // Get Card Comments
  async getCardComments(cardId: string, limit: number = 100): Promise<TrelloComment[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/cards/${cardId}/actions`, {
        params: {
          filter: 'commentCard',
          limit: limit,
        },
      });
      return response.data;
    });
  }

  // Checklist methods
  async getChecklistItems(name: string, cardId?: string, boardId?: string): Promise<CheckListItem[]> {
    let checklists: TrelloChecklist[];

    if (cardId) {
      // Get checklists from the specific card
      const cardResponse = await this.axiosInstance.get<EnhancedTrelloCard>(`/cards/${cardId}`, {
        params: { checklists: 'all' }
      });
      checklists = cardResponse.data.checklists || [];
    } else {
      // Fall back to board-level search
      const effectiveBoardId = boardId || this.activeConfig.boardId;
      if (!effectiveBoardId) {
        throw new McpError(ErrorCode.InvalidParams, 'No board ID or card ID provided and no active board set');
      }

      const response = await this.axiosInstance.get<TrelloChecklist[]>(
        `/boards/${effectiveBoardId}/checklists`
      );
      checklists = response.data;
    }

    const allCheckItems: CheckListItem[] = [];

    for (const checklist of checklists) {
      if (checklist.name.toLowerCase() === name.toLowerCase()) {
        const convertedItems = checklist.checkItems.map(item =>
          this.convertToCheckListItem(item, checklist.id)
        );
        allCheckItems.push(...convertedItems);
      }
    }

    return allCheckItems;
  }

  async addChecklistItem(
    text: string,
    checkListName: string,
    cardId?: string,
    boardId?: string
  ): Promise<CheckListItem> {
    let checklists: TrelloChecklist[];

    if (cardId) {
      // Get checklists from the specific card
      const cardResponse = await this.axiosInstance.get<EnhancedTrelloCard>(`/cards/${cardId}`, {
        params: { checklists: 'all' }
      });
      checklists = cardResponse.data.checklists || [];
    } else {
      // Fall back to board-level search
      const effectiveBoardId = boardId || this.activeConfig.boardId;
      if (!effectiveBoardId) {
        throw new McpError(ErrorCode.InvalidParams, 'No board ID or card ID provided and no active board set');
      }

      const checklistsResponse = await this.axiosInstance.get<TrelloChecklist[]>(
        `/boards/${effectiveBoardId}/checklists`
      );
      checklists = checklistsResponse.data;
    }

    const targetChecklist = checklists.find(
      checklist => checklist.name.toLowerCase() === checkListName.toLowerCase()
    );

    if (!targetChecklist) {
      throw new McpError(ErrorCode.InvalidParams, `Checklist "${checkListName}" not found${cardId ? ' on card' : ' on board'}`);
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

  async findChecklistItemsByDescription(
    description: string,
    cardId?: string,
    boardId?: string
  ): Promise<CheckListItem[]> {
    let checklists: TrelloChecklist[];

    if (cardId) {
      // Get checklists from the specific card
      const cardResponse = await this.axiosInstance.get<EnhancedTrelloCard>(`/cards/${cardId}`, {
        params: { checklists: 'all' }
      });
      checklists = cardResponse.data.checklists || [];
    } else {
      // Fall back to board-level search
      const effectiveBoardId = boardId || this.activeConfig.boardId;
      if (!effectiveBoardId) {
        throw new McpError(ErrorCode.InvalidParams, 'No board ID or card ID provided and no active board set');
      }

      const response = await this.axiosInstance.get<TrelloChecklist[]>(
        `/boards/${effectiveBoardId}/checklists`
      );
      checklists = response.data;
    }

    const matchingItems: CheckListItem[] = [];
    const searchTerm = description.toLowerCase();

    for (const checklist of checklists) {
      for (const checkItem of checklist.checkItems) {
        if (checkItem.name.toLowerCase().includes(searchTerm)) {
          matchingItems.push(this.convertToCheckListItem(checkItem, checklist.id));
        }
      }
    }

    return matchingItems;
  }

  async getAcceptanceCriteria(cardId?: string, boardId?: string): Promise<CheckListItem[]> {
    return this.getChecklistItems('Acceptance Criteria', cardId, boardId);
  }

  async createChecklist(name: string, cardId: string): Promise<TrelloChecklist> {
    if (!cardId) {
      throw new McpError(ErrorCode.InvalidParams, 'No card ID provided and no active card set');
    }
    const response = await this.axiosInstance.post<TrelloChecklist>(`/cards/${cardId}/checklists`, { name });
    return response.data;
  }

  async getChecklistByName(name: string, cardId?: string, boardId?: string): Promise<CheckList | null> {
    let checklists: TrelloChecklist[];

    if (cardId) {
      // Get checklists from the specific card
      const cardResponse = await this.axiosInstance.get<EnhancedTrelloCard>(`/cards/${cardId}`, {
        params: { checklists: 'all' }
      });
      checklists = cardResponse.data.checklists || [];
    } else {
      // Fall back to board-level search
      const effectiveBoardId = boardId || this.activeConfig.boardId;
      if (!effectiveBoardId) {
        throw new McpError(ErrorCode.InvalidParams, 'No board ID or card ID provided and no active board set');
      }

      const response = await this.axiosInstance.get<TrelloChecklist[]>(
        `/boards/${effectiveBoardId}/checklists`
      );
      checklists = response.data;
    }

    const targetChecklist = checklists.find(
      checklist => checklist.name.toLowerCase() === name.toLowerCase()
    );

    if (targetChecklist) {
      return this.convertToCheckList(targetChecklist);
    }

    return null;
  }

  /**
   * Update a checklist item state (complete/incomplete)
   */
  async updateChecklistItem(
    cardId: string,
    checkItemId: string,
    state: 'complete' | 'incomplete'
  ): Promise<TrelloCheckItem> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put<TrelloCheckItem>(
        `/cards/${cardId}/checkItem/${checkItemId}`,
        {
          state,
        }
      );
      return response.data;
    });
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
  private convertToCheckListItem(
    trelloItem: TrelloCheckItem,
    parentCheckListId: string
  ): CheckListItem {
    return {
      id: trelloItem.id,
      text: trelloItem.name,
      complete: trelloItem.state === 'complete',
      parentCheckListId,
    };
  }

  private convertToCheckList(trelloChecklist: TrelloChecklist): CheckList {
    const completedItems = trelloChecklist.checkItems.filter(
      item => item.state === 'complete'
    ).length;
    const totalItems = trelloChecklist.checkItems.length;
    const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      id: trelloChecklist.id,
      name: trelloChecklist.name,
      items: trelloChecklist.checkItems.map(item =>
        this.convertToCheckListItem(item, trelloChecklist.id)
      ),
      percentComplete,
    };
  }

  // Member management methods
  async getBoardMembers(boardId?: string): Promise<TrelloMember[]> {
    const effectiveBoardId = boardId || this.activeConfig.boardId || this.defaultBoardId;
    if (!effectiveBoardId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'boardId is required when no default board is configured'
      );
    }
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${effectiveBoardId}/members`);
      return response.data;
    });
  }

  async assignMemberToCard(
    cardId: string,
    memberId: string
  ): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post(`/cards/${cardId}/idMembers`, {
        value: memberId,
      });
      return response.data;
    });
  }

  async removeMemberFromCard(
    cardId: string,
    memberId: string
  ): Promise<any[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.delete(`/cards/${cardId}/idMembers/${memberId}`);
      return response.data;
    });
  }

  // Label management methods
  async getBoardLabels(boardId?: string): Promise<TrelloLabelDetails[]> {
    const effectiveBoardId = boardId || this.activeConfig.boardId || this.defaultBoardId;
    if (!effectiveBoardId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'boardId is required when no default board is configured'
      );
    }
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${effectiveBoardId}/labels`);
      return response.data;
    });
  }

  async createLabel(
    boardId: string | undefined,
    name: string,
    color?: string
  ): Promise<TrelloLabelDetails> {
    const effectiveBoardId = boardId || this.activeConfig.boardId || this.defaultBoardId;
    if (!effectiveBoardId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'boardId is required when no default board is configured'
      );
    }
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post(`/boards/${effectiveBoardId}/labels`, {
        name,
        color,
      });
      return response.data;
    });
  }

  async updateLabel(
    labelId: string,
    name?: string,
    color?: string
  ): Promise<TrelloLabelDetails> {
    return this.handleRequest(async () => {
      const updateData: { name?: string; color?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;

      const response = await this.axiosInstance.put(`/labels/${labelId}`, updateData);
      return response.data;
    });
  }

  async deleteLabel(labelId: string): Promise<boolean> {
    return this.handleRequest(async () => {
      await this.axiosInstance.delete(`/labels/${labelId}`);
      return true;
    });
  }

  // Card history method
  async getCardHistory(
    cardId: string,
    filter?: string,
    limit?: number
  ): Promise<TrelloAction[]> {
    return this.handleRequest(async () => {
      const params: { filter?: string; limit?: number } = {};
      if (filter) params.filter = filter;
      if (limit) params.limit = limit;

      const response = await this.axiosInstance.get(`/cards/${cardId}/actions`, { params });
      return response.data;
    });
  }
}

const MIME_TYPES: Readonly<{ [key: string]: string }> = Object.freeze({
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.log': 'text/plain',

  // Code
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.ts': 'application/typescript',
  '.tsx': 'application/typescript',
  '.jsx': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',

  // Media
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.webm': 'video/webm',
});
