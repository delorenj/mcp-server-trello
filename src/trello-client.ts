import axios, { AxiosInstance } from 'axios';
import { TrelloConfig, TrelloCard, TrelloList, TrelloAction, TrelloMember } from './types.js';
import { createTrelloRateLimiters } from './rate-limiter.js';

// Create a simple standalone Trello client for testing
export async function fetchListsDirectly(config: TrelloConfig): Promise<TrelloList[]> {
  console.error('Fetching lists directly with standalone function...');
  try {
    const response = await axios.get(`https://api.trello.com/1/boards/${config.boardId}/lists`, {
      params: {
        key: config.apiKey,
        token: config.token
      }
    });
    console.error(`Direct fetch succeeded! Found ${response.data.length} lists.`);
    return response.data;
  } catch (error) {
    console.error('Direct fetch failed:', error);
    throw error;
  }
}

export class TrelloClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter;

  constructor(private config: TrelloConfig) {
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
      await this.rateLimiter.waitForAvailable();
      return config;
    });

    // Add logging interceptor (DEBUG)
    this.axiosInstance.interceptors.request.use((config) => {
      console.error('--- Axios Request ---');
      console.error(`Method: ${config.method?.toUpperCase()}`);
      
      // Construct the full URL for logging, including base URL and params
      let url: URL;
      try {
        url = new URL(config.url || '', config.baseURL);
      } catch (error) {
        console.error(`Error creating URL: ${error}`);
        console.error(`baseURL: ${config.baseURL}, url: ${config.url}`);
        // Fallback if URL construction fails
        url = new URL('https://api.trello.com/1');
      }
      
      // Make sure params are properly applied
      Object.entries(config.params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
      
      // Mask sensitive parts for logging
      const loggedUrl = url.toString().replace(/key=[^&]+/, 'key=***').replace(/token=[^&]+/, 'token=***');
      console.error(`URL: ${loggedUrl}`);
      console.error('---------------------');
      return config;
    });
  }

  private async handleRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios Error:', error.message);
        console.error('Request URL:', error.config?.url);
        console.error('Request baseURL:', error.config?.baseURL);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        
        if (error.response?.status === 429) {
          // Rate limit exceeded, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.handleRequest(request);
        }
        // Use message from Trello if available, otherwise generic Axios message
        const message = error.response?.data || (error.response?.statusText ?? error.message);
        throw new Error(`Trello API error: ${message}`);
      }
      throw error;
    }
  }

  async getLists(): Promise<TrelloList[]> {
    console.error('Getting lists from board using client...');
    
    // Try the standalone function first
    try {
      return await fetchListsDirectly(this.config);
    } catch (directError) {
      console.error('Standalone function failed, falling back to regular client...');
      
      // Fall back to normal client
      return this.handleRequest(async () => {
        const response = await this.axiosInstance.get(`/boards/${this.config.boardId}/lists`);
        return response.data;
      });
    }
  }

  async getCardsByList(listId: string): Promise<TrelloCard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/lists/${listId}/cards`);
      return response.data;
    });
  }

  async getRecentActivity(limit: number = 10): Promise<TrelloAction[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${this.config.boardId}/actions`, {
        params: { limit },
      });
      return response.data;
    });
  }

  async addCard(params: {
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

  async updateCard(params: {
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

  async archiveCard(cardId: string): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        closed: true,
      });
      return response.data;
    });
  }

  async moveCard(cardId: string, listId: string): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        idList: listId,
      });
      return response.data;
    });
  }

  async addList(name: string): Promise<TrelloList> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/lists', {
        name,
        idBoard: this.config.boardId,
      });
      return response.data;
    });
  }

  async archiveList(listId: string): Promise<TrelloList> {
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
}