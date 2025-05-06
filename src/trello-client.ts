import axios, { AxiosInstance } from 'axios';
import { TrelloConfig, TrelloCard, TrelloList, TrelloAction, TrelloMember, TrelloAttachment, TrelloBoard } from './types.js';
import { createTrelloRateLimiters } from './rate-limiter.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class TrelloClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter;

  constructor(private config: Omit<TrelloConfig, 'boardId'>) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.trello.com/1',
      params: {
        key: config.apiKey,
        token: config.token,
      },
    });

    this.rateLimiter = createTrelloRateLimiters();

    // Add rate limiting interceptor
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.waitForAvailableToken();
      return config;
    });
  }

  private async handleRequest<T = any>(requestFn: () => Promise<T>): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Trello API Error:', error.response?.data || error.message);
        // Customize error handling based on Trello's error structure if needed
        throw new McpError(
          ErrorCode.InternalError,
          `Trello API Error: ${error.response?.status} ${error.message}`,
          error.response?.data
        );
      } else {
        console.error('Unexpected Error:', error);
        throw new McpError(ErrorCode.InternalError, 'An unexpected error occurred');
      }
    }
  }

  async getBoards(): Promise<TrelloBoard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/members/me/boards');
      return response.data;
    });
  }

  async getCardsByList(boardId: string, listId: string): Promise<TrelloCard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/lists/${listId}/cards`);
      return response.data;
    });
  }

  async getLists(boardId: string): Promise<TrelloList[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${boardId}/lists`);
      return response.data;
    });
  }

  async getRecentActivity(boardId: string, limit: number = 10): Promise<TrelloAction[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${boardId}/actions`, {
        params: { ...this.axiosInstance.defaults.params, limit },
      });
      return response.data;
    });
  }

  async addCard(boardId: string, params: {
    listId: string;
    name: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
  }): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/cards', {
        idList: params.listId,
        name: params.name,
        desc: params.description,
        due: params.dueDate,
        idLabels: params.labels,
      });
      return response.data;
    });
  }

  async updateCard(boardId: string, params: {
    cardId: string;
    name?: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
  }): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${params.cardId}`, {
        name: params.name,
        desc: params.description,
        due: params.dueDate,
        idLabels: params.labels,
      });
      return response.data;
    });
  }

  async archiveCard(boardId: string, cardId: string): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        closed: true,
      });
      return response.data;
    });
  }

  async moveCard(boardId: string, cardId: string, listId: string): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        idList: listId,
        idBoard: boardId,
      });
      return response.data;
    });
  }

  async addList(boardId: string, name: string): Promise<TrelloList> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/lists', {
        name,
        idBoard: boardId,
      });
      return response.data;
    });
  }

  async archiveList(boardId: string, listId: string): Promise<TrelloList> {
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

  async attachImageToCard(boardId: string, cardId: string, imageUrl: string, name?: string): Promise<TrelloAttachment> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post(`/cards/${cardId}/attachments`, {
        url: imageUrl,
        name: name || 'Image Attachment',
      });
      return response.data;
    });
  }
}
