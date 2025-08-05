import axios, { AxiosInstance } from 'axios';
import {
  TrelloConfig,
  TrelloCard,
  TrelloList,
  TrelloAction,
  TrelloAttachment,
  TrelloBoard,
  TrelloWorkspace,
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
      labels?: string[];
    }
  ): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${params.cardId}`, {
        name: params.name,
        desc: params.description,
        due: params.dueDate,
        start: params.start,
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
}
