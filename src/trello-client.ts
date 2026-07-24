import axios, { AxiosInstance, CreateAxiosDefaults } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
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
  TrelloCheckItemUpdate,
  CheckList,
  CheckListItem,
  TrelloComment,
  TrelloMember,
  TrelloLabelDetails,
  TrelloCustomFieldDefinition,
  TrelloCustomFieldOption,
  TrelloCustomFieldItem,
} from './types.js';
import { createTrelloRateLimiters } from './rate-limiter.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as attachments from './trello/attachments.js';
import { validateExternalUrl } from './url-validator.js';

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
    const axiosConfig: CreateAxiosDefaults = {
      baseURL: 'https://api.trello.com/1',
      params: {
        key: config.apiKey,
        token: config.token,
      },
    };

    const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      const agent = new HttpsProxyAgent(proxyUrl);
      axiosConfig.httpAgent = agent;
      axiosConfig.httpsAgent = agent;
      axiosConfig.proxy = false;
    }

    this.axiosInstance = axios.create(axiosConfig);

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
   * Check if workspace restriction is enabled
   */
  get hasWorkspaceRestriction(): boolean {
    return this.config.allowedWorkspaceIds !== undefined && this.config.allowedWorkspaceIds.length > 0;
  }

  /**
   * Check if a workspace ID is in the allowed list (or if no restriction is set)
   */
  isWorkspaceAllowed(workspaceId: string): boolean {
    if (!this.hasWorkspaceRestriction) {
      return true;
    }
    return this.config.allowedWorkspaceIds!.includes(workspaceId);
  }

  /**
   * Validate workspace access, throwing an error if restricted
   */
  private validateWorkspaceAccess(workspaceId: string): void {
    if (!this.isWorkspaceAllowed(workspaceId)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Access to workspace '${workspaceId}' is not allowed. Allowed workspaces: ${this.config.allowedWorkspaceIds!.join(', ')}`
      );
    }
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
   * Validates against allowedWorkspaceIds if configured
   */
  async setActiveWorkspace(workspaceId: string): Promise<TrelloWorkspace> {
    // Validate workspace access before proceeding
    this.validateWorkspaceAccess(workspaceId);

    // Verify the workspace exists
    const workspace = await this.getWorkspaceById(workspaceId);
    this.activeConfig.workspaceId = workspaceId;
    await this.saveConfig();
    return workspace;
  }

  private static readonly MAX_RETRY_ATTEMPTS = 3;

  // T is unconstrained on purpose: it only threads the caller's return type through.
  // A closed union here excluded every T[] and broke each new return shape.
  private async handleRequest<T>(requestFn: () => Promise<T>, retryCount: number = 0): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429 && retryCount < TrelloClient.MAX_RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          return this.handleRequest(requestFn, retryCount + 1);
        }
        if (error.response?.status === 429) {
          throw new McpError(
            ErrorCode.InternalError,
            `Trello API rate limit exceeded after ${TrelloClient.MAX_RETRY_ATTEMPTS} retries`
          );
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Trello API Error: ${error.response?.status} ${error.message}`,
          error.response?.data
        );
      } else {
        throw new McpError(ErrorCode.InternalError, 'An unexpected error occurred');
      }
    }
  }

  /**
   * List all boards the user has access to
   * If allowedWorkspaceIds is configured, only returns boards from allowed workspaces
   */
  async listBoards(): Promise<TrelloBoard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/members/me/boards');
      const boards: TrelloBoard[] = response.data;

      // Filter by allowed workspaces if restriction is enabled
      if (this.hasWorkspaceRestriction) {
        return boards.filter(board => board.idOrganization && this.isWorkspaceAllowed(board.idOrganization));
      }
      return boards;
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
   * If allowedWorkspaceIds is configured, only returns workspaces in that list
   */
  async listWorkspaces(): Promise<TrelloWorkspace[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/members/me/organizations');
      const workspaces: TrelloWorkspace[] = response.data;

      // Filter by allowed workspaces if restriction is enabled
      if (this.hasWorkspaceRestriction) {
        return workspaces.filter(ws => this.isWorkspaceAllowed(ws.id));
      }
      return workspaces;
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
   * Validates against allowedWorkspaceIds if configured
   */
  async listBoardsInWorkspace(workspaceId: string): Promise<TrelloBoard[]> {
    // Validate workspace access before proceeding
    this.validateWorkspaceAccess(workspaceId);

    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/organizations/${workspaceId}/boards`);
      return response.data;
    });
  }

  /**
   * Create a new board
   * Validates target workspace against allowedWorkspaceIds if configured
   */
  async createBoard(params: {
    name: string;
    desc?: string;
    idOrganization?: string;
    defaultLabels?: boolean;
    defaultLists?: boolean;
  }): Promise<TrelloBoard> {
    // Determine the target workspace
    const targetWorkspace = params.idOrganization ?? this.activeConfig.workspaceId;

    // When workspace restrictions are enabled, require a valid workspace
    if (this.hasWorkspaceRestriction) {
      if (!targetWorkspace) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Workspace restrictions are enabled but no workspace was specified. Provide idOrganization or set an active workspace. Allowed workspaces: ${this.config.allowedWorkspaceIds!.join(', ')}`
        );
      }
      this.validateWorkspaceAccess(targetWorkspace);
    }

    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/boards', {
        name: params.name,
        desc: params.desc,
        idOrganization: targetWorkspace,
        defaultLabels: params.defaultLabels,
        defaultLists: params.defaultLists,
      });
      return response.data;
    });
  }

  async getCardsByList(
    listId: string,
    fields?: string,
    nameFilter?: string
  ): Promise<TrelloCard[]> {
    return this.handleRequest(async () => {
      const params = fields ? { fields } : {};
      const response = await this.axiosInstance.get(`/lists/${listId}/cards`, { params });
      let cards: TrelloCard[] = response.data;
      const trimmed = nameFilter?.trim();
      if (trimmed) {
        const searchTerm = trimmed.toLowerCase();
        cards = cards.filter((card) => card.name.toLowerCase().includes(searchTerm));
      }
      return cards;
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

  async getRecentActivity(boardId?: string, limit: number = 10, since?: string, before?: string): Promise<TrelloAction[]> {
    const effectiveBoardId = boardId || this.activeConfig.boardId || this.defaultBoardId;
    if (!effectiveBoardId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'boardId is required when no default board is configured'
      );
    }
    return this.handleRequest(async () => {
      const params: Record<string, string | number> = { limit };
      if (since) params.since = since;
      if (before) params.before = before;
      const response = await this.axiosInstance.get(`/boards/${effectiveBoardId}/actions`, {
        params,
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
      dueReminder?: number | null;
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
        dueReminder: params.dueReminder,
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
      dueReminder?: number | null;
      start?: string;
      dueComplete?: boolean;
      labels?: string[];
      pos?: string | number;
    }
  ): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${params.cardId}`, {
        name: params.name,
        desc: params.description,
        due: params.dueDate,
        dueReminder: params.dueReminder,
        start: params.start,
        dueComplete: params.dueComplete,
        idLabels: params.labels,
        pos: params.pos,
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

  async moveCard(boardId: string | undefined, cardId: string, listId: string, pos?: string | number): Promise<TrelloCard> {
    const effectiveBoardId = boardId || this.defaultBoardId;
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        idList: listId,
        ...(effectiveBoardId && { idBoard: effectiveBoardId }),
        ...(pos !== undefined && { pos }),
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

  async updateList(
    listId: string,
    params: {
      name?: string;
      closed?: boolean;
      subscribed?: boolean;
      idBoard?: string;
    }
  ): Promise<TrelloList> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/lists/${listId}`, params);
      return response.data;
    });
  }

  async watchCard(cardId: string, subscribed: boolean): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        subscribed,
      });
      return response.data;
    });
  }

  async watchList(listId: string, subscribed: boolean): Promise<TrelloList> {
    return this.updateList(listId, { subscribed });
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
    if (!imageUrl.startsWith('file://')) {
      validateExternalUrl(imageUrl);
    }
    return this.handleRequest(() =>
      attachments.attachImage(this.axiosInstance, { cardId, imageUrl, name })
    );
  }

  async attachDataToCard(
    boardId: string | undefined,
    cardId: string,
    data: string,
    name?: string,
    mimeType?: string
  ): Promise<TrelloAttachment> {
    return this.handleRequest(() =>
      attachments.attachData(this.axiosInstance, { cardId, data, name, mimeType })
    );
  }

  async attachImageDataToCard(
    boardId: string | undefined,
    cardId: string,
    imageData: string,
    name?: string,
    mimeType?: string
  ): Promise<TrelloAttachment> {
    return this.handleRequest(() =>
      attachments.attachImageData(this.axiosInstance, { cardId, imageData, name, mimeType })
    );
  }

  async attachFileToCard(
    boardId: string | undefined,
    cardId: string,
    fileUrl: string,
    name?: string,
    mimeType?: string
  ): Promise<TrelloAttachment> {
    if (!fileUrl.startsWith('file://')) {
      validateExternalUrl(fileUrl);
    }
    return this.handleRequest(() =>
      attachments.attachFile(this.axiosInstance, { cardId, fileUrl, name, mimeType })
    );
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
   * Update a checklist item using Trello's supported mutable fields.
   */
  async updateChecklistItem(
    cardId: string,
    checkItemId: string,
    updates: TrelloCheckItemUpdate | TrelloCheckItem['state']
  ): Promise<TrelloCheckItem> {
    const normalizedUpdates =
      typeof updates === 'string' ? { state: updates } : updates;
    const payload = Object.fromEntries(
      Object.entries(normalizedUpdates).filter(([, value]) => value !== undefined)
    ) as TrelloCheckItemUpdate;

    if (Object.keys(payload).length === 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'At least one checklist item field must be provided'
      );
    }

    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put<TrelloCheckItem>(
        `/cards/${cardId}/checkItem/${checkItemId}`,
        payload
      );
      return response.data;
    });
  }

  /**
   * Delete a checklist item from a card.
   */
  async deleteChecklistItem(cardId: string, checkItemId: string): Promise<boolean> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.delete(`/cards/${cardId}/checkItem/${checkItemId}`);
      return response.status >= 200 && response.status < 300;
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

  async searchLabels(boardId: string | undefined, query: string): Promise<TrelloLabelDetails[]> {
    const labels = await this.getBoardLabels(boardId);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return labels.filter(label => {
      const normalizedName = label.name.toLowerCase();
      const normalizedColor = label.color?.toLowerCase() ?? '';

      return (
        normalizedName.includes(normalizedQuery) || normalizedColor.includes(normalizedQuery)
      );
    });
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<boolean> {
    return this.handleRequest(async () => {
      await this.axiosInstance.delete(`/cards/${cardId}/idLabels/${labelId}`);
      return true;
    });
  }

  /**
   * Copy a card (can copy across boards). Uses idCardSource to clone a card.
   */
  async copyCard(params: {
    sourceCardId: string;
    listId: string;
    name?: string;
    description?: string;
    keepFromSource?: string;
    pos?: string;
  }): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/cards', {
        idCardSource: params.sourceCardId,
        idList: params.listId,
        name: params.name,
        desc: params.description,
        keepFromSource: params.keepFromSource || 'all',
        pos: params.pos,
      });
      return response.data;
    });
  }

  /**
   * Copy a checklist from one card to another (can copy across boards).
   */
  async copyChecklist(params: {
    sourceChecklistId: string;
    cardId: string;
    name?: string;
    pos?: string;
  }): Promise<TrelloChecklist> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/checklists', {
        idCard: params.cardId,
        idChecklistSource: params.sourceChecklistId,
        name: params.name,
        pos: params.pos,
      });
      return response.data;
    });
  }

  static readonly BATCH_ADD_CARDS_LIMIT = 50;

  /**
   * Add multiple cards to a list. Trello has no native batch write endpoint,
   * so this makes sequential POST /1/cards calls.
   * Returns created cards and any errors, so callers can see partial progress.
   */
  async batchAddCards(
    listId: string,
    cards: Array<{
      name: string;
      description?: string;
      dueDate?: string;
      start?: string;
      labels?: string[];
    }>
  ): Promise<{ created: TrelloCard[]; errors: Array<{ index: number; name: string; error: string }> }> {
    if (cards.length > TrelloClient.BATCH_ADD_CARDS_LIMIT) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Cannot create more than ${TrelloClient.BATCH_ADD_CARDS_LIMIT} cards at once (got ${cards.length})`
      );
    }
    const created: TrelloCard[] = [];
    const errors: Array<{ index: number; name: string; error: string }> = [];
    for (let i = 0; i < cards.length; i++) {
      try {
        const result = await this.addCard(undefined, {
          listId,
          name: cards[i].name,
          description: cards[i].description,
          dueDate: cards[i].dueDate,
          start: cards[i].start,
          labels: cards[i].labels,
        });
        created.push(result);
      } catch (error) {
        errors.push({
          index: i,
          name: cards[i].name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return { created, errors };
  }

  // Custom field management methods
  async getBoardCustomFields(boardId?: string): Promise<TrelloCustomFieldDefinition[]> {
    const effectiveBoardId = boardId || this.activeConfig.boardId || this.defaultBoardId;
    if (!effectiveBoardId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'boardId is required when no default board is configured'
      );
    }
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${effectiveBoardId}/customFields`);
      return response.data;
    });
  }

  async getCustomFieldOptions(customFieldId: string): Promise<TrelloCustomFieldOption[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/customFields/${customFieldId}/options`);
      return response.data;
    });
  }

  async updateCardCustomField(
    cardId: string,
    customFieldId: string,
    params: {
      type: 'text' | 'number' | 'checkbox' | 'date' | 'list' | 'clear';
      value?: string;
    }
  ): Promise<TrelloCustomFieldItem> {
    return this.handleRequest(async () => {
      let body: Record<string, unknown>;

      if (params.type === 'clear') {
        body = { value: '', idValue: '' };
      } else if (params.type === 'list') {
        body = { idValue: params.value };
      } else if (params.type === 'text') {
        body = { value: { text: params.value } };
      } else if (params.type === 'number') {
        body = { value: { number: params.value } };
      } else if (params.type === 'checkbox') {
        body = { value: { checked: params.value } };
      } else if (params.type === 'date') {
        body = { value: { date: params.value } };
      } else {
        // Defensive: unreachable with current type union, guards against future additions
        throw new McpError(ErrorCode.InvalidParams, `Unknown custom field type: ${params.type}`);
      }

      const response = await this.axiosInstance.put(
        `/cards/${cardId}/customField/${customFieldId}/item`,
        body
      );
      return response.data;
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

  /**
   * Download an attachment from a card with authentication
   * Returns base64-encoded data along with metadata
   */
  async downloadAttachment(
    cardId: string,
    attachmentId: string
  ): Promise<{ data: string; mimeType: string; fileName: string }> {
    return this.handleRequest(async () => {
      // First get attachment metadata to get the filename
      const metaResponse = await this.axiosInstance.get(
        `/cards/${cardId}/attachments/${attachmentId}`
      );
      const attachment = metaResponse.data;

      // Download using OAuth header (required for attachment downloads)
      const downloadUrl = `https://api.trello.com/1/cards/${cardId}/attachments/${attachmentId}/download/${encodeURIComponent(attachment.fileName)}`;
      const response = await this.axiosInstance.get(downloadUrl, {
        headers: {
          Authorization: 'OAuth oauth_consumer_key="' + this.config.apiKey + '", oauth_token="' + this.config.token + '"',
        },
        responseType: 'arraybuffer',
      });

      // Convert to base64
      const base64Data = Buffer.from(response.data).toString('base64');

      return {
        data: base64Data,
        mimeType: attachment.mimeType || 'application/octet-stream',
        fileName: attachment.fileName || 'attachment',
      };
    });
  }
}
