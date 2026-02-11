import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { TrelloClient } from '../../src/trello-client.js';

// Shared mock instance that axios.create will return
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    isAxiosError: vi.fn(() => false),
  },
}));

// Mock rate-limiter
vi.mock('../../src/rate-limiter.js', () => ({
  createTrelloRateLimiters: () => ({
    apiKeyLimiter: { canMakeRequest: () => true, waitForAvailableToken: async () => {} },
    tokenLimiter: { canMakeRequest: () => true, waitForAvailableToken: async () => {} },
    canMakeRequest: () => true,
    waitForAvailableToken: async () => {},
  }),
}));

// Mock fs/promises for config loading
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(async () => {}),
  readFile: vi.fn(async () => {
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  }),
  writeFile: vi.fn(async () => {}),
  access: vi.fn(async () => {}),
}));

function createClient(overrides?: { boardId?: string; defaultBoardId?: string }) {
  return new TrelloClient({
    apiKey: 'test-key',
    token: 'test-token',
    boardId: overrides?.boardId,
    defaultBoardId: overrides?.defaultBoardId,
  });
}

describe('TrelloClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct base URL and auth', () => {
      createClient();
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.trello.com/1',
          params: { key: 'test-key', token: 'test-token' },
        })
      );
    });
  });

  describe('listBoards', () => {
    it('should fetch user boards', async () => {
      const boards = [{ id: 'b1', name: 'Board 1' }];
      mockAxiosInstance.get.mockResolvedValue({ data: boards });

      const client = createClient();
      const result = await client.listBoards();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/members/me/boards');
      expect(result).toEqual(boards);
    });
  });

  describe('getBoardById', () => {
    it('should fetch a specific board', async () => {
      const board = { id: 'b1', name: 'Test Board' };
      mockAxiosInstance.get.mockResolvedValue({ data: board });

      const client = createClient();
      const result = await client.getBoardById('b1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/boards/b1');
      expect(result).toEqual(board);
    });
  });

  describe('getLists', () => {
    it('should use provided boardId', async () => {
      const lists = [{ id: 'l1', name: 'List 1' }];
      mockAxiosInstance.get.mockResolvedValue({ data: lists });

      const client = createClient();
      const result = await client.getLists('board123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/boards/board123/lists');
      expect(result).toEqual(lists);
    });

    it('should fall back to active board', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const client = createClient({ boardId: 'active-board' });
      await client.getLists();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/boards/active-board/lists');
    });

    it('should throw when no board ID available', async () => {
      const client = createClient();
      await expect(client.getLists()).rejects.toThrow(
        'boardId is required when no default board is configured'
      );
    });
  });

  describe('addCard', () => {
    it('should create card with all parameters', async () => {
      const card = { id: 'c1', name: 'New Card' };
      mockAxiosInstance.post.mockResolvedValue({ data: card });

      const client = createClient();
      const result = await client.addCard(undefined, {
        listId: 'l1',
        name: 'New Card',
        description: 'A description',
        dueDate: '2024-12-31T00:00:00Z',
        start: '2024-12-01',
        labels: ['label1'],
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/cards', {
        idList: 'l1',
        name: 'New Card',
        desc: 'A description',
        due: '2024-12-31T00:00:00Z',
        start: '2024-12-01',
        idLabels: ['label1'],
      });
      expect(result).toEqual(card);
    });

    it('should create card with minimal parameters', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'c1' } });

      const client = createClient();
      await client.addCard(undefined, { listId: 'l1', name: 'Card' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/cards', {
        idList: 'l1',
        name: 'Card',
        desc: undefined,
        due: undefined,
        start: undefined,
        idLabels: undefined,
      });
    });
  });

  describe('updateCard', () => {
    it('should update card fields', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { id: 'c1', name: 'Updated' } });

      const client = createClient();
      await client.updateCard(undefined, {
        cardId: 'c1',
        name: 'Updated',
        dueComplete: true,
      });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/cards/c1', {
        name: 'Updated',
        desc: undefined,
        due: undefined,
        start: undefined,
        dueComplete: true,
        idLabels: undefined,
      });
    });
  });

  describe('archiveCard', () => {
    it('should set closed to true', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { id: 'c1', closed: true } });

      const client = createClient();
      await client.archiveCard(undefined, 'c1');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/cards/c1', { closed: true });
    });
  });

  describe('moveCard', () => {
    it('should update card list', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { id: 'c1' } });

      const client = createClient();
      await client.moveCard(undefined, 'c1', 'l2');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/cards/c1', { idList: 'l2' });
    });

    it('should include boardId when provided', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { id: 'c1' } });

      const client = createClient({ defaultBoardId: 'b1' });
      await client.moveCard('b2', 'c1', 'l2');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/cards/c1', {
        idList: 'l2',
        idBoard: 'b2',
      });
    });
  });

  describe('addList', () => {
    it('should create list on board', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'l1', name: 'New List' } });

      const client = createClient({ boardId: 'b1' });
      await client.addList(undefined, 'New List');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/lists', {
        name: 'New List',
        idBoard: 'b1',
      });
    });

    it('should throw when no board ID available', async () => {
      const client = createClient();
      await expect(client.addList(undefined, 'List')).rejects.toThrow(
        'boardId is required'
      );
    });
  });

  describe('archiveList', () => {
    it('should set list closed value to true', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { id: 'l1' } });

      const client = createClient();
      await client.archiveList(undefined, 'l1');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/lists/l1/closed', { value: true });
    });
  });

  describe('getMyCards', () => {
    it('should fetch current user cards', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const client = createClient();
      await client.getMyCards();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/members/me/cards');
    });
  });

  describe('Comments', () => {
    it('addCommentToCard should post comment', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'comment1' } });

      const client = createClient();
      await client.addCommentToCard('c1', 'Hello');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'cards/c1/actions/comments?text=Hello'
      );
    });

    it('addCommentToCard should encode special characters', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'comment1' } });

      const client = createClient();
      await client.addCommentToCard('c1', 'Hello World & Test');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'cards/c1/actions/comments?text=Hello%20World%20%26%20Test'
      );
    });

    it('updateCommentOnCard should return true on success', async () => {
      mockAxiosInstance.put.mockResolvedValue({ status: 200, data: {} });

      const client = createClient();
      const result = await client.updateCommentOnCard('comment1', 'Updated text');

      expect(result).toBe(true);
    });

    it('updateCommentOnCard should return false on non-200', async () => {
      mockAxiosInstance.put.mockResolvedValue({ status: 201, data: {} });

      const client = createClient();
      const result = await client.updateCommentOnCard('comment1', 'Text');

      expect(result).toBe(false);
    });

    it('deleteCommentFromCard should call delete', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ status: 200 });

      const client = createClient();
      await client.deleteCommentFromCard('comment1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/actions/comment1');
    });

    it('getCardComments should fetch with filter and limit', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const client = createClient();
      await client.getCardComments('c1', 50);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/cards/c1/actions', {
        params: { filter: 'commentCard', limit: 50 },
      });
    });
  });

  describe('Checklists', () => {
    it('createChecklist should post to card', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'cl1', name: 'Checklist' } });

      const client = createClient();
      await client.createChecklist('My Checklist', 'c1');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/cards/c1/checklists', {
        name: 'My Checklist',
      });
    });

    it('createChecklist should throw when no cardId', async () => {
      const client = createClient();
      await expect(client.createChecklist('Name', '')).rejects.toThrow('No card ID provided');
    });

    it('updateChecklistItem should update state', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { id: 'ci1', state: 'complete' } });

      const client = createClient();
      await client.updateChecklistItem('c1', 'ci1', 'complete');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/cards/c1/checkItem/ci1', {
        state: 'complete',
      });
    });
  });

  describe('Members', () => {
    it('getBoardMembers should fetch members', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const client = createClient({ boardId: 'b1' });
      await client.getBoardMembers();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/boards/b1/members');
    });

    it('assignMemberToCard should post member', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'c1' } });

      const client = createClient();
      await client.assignMemberToCard('c1', 'm1');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/cards/c1/idMembers', { value: 'm1' });
    });

    it('removeMemberFromCard should delete member', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: [] });

      const client = createClient();
      await client.removeMemberFromCard('c1', 'm1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/cards/c1/idMembers/m1');
    });
  });

  describe('Labels', () => {
    it('createLabel should post to board', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'lbl1' } });

      const client = createClient({ boardId: 'b1' });
      await client.createLabel(undefined, 'Bug', 'red');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/boards/b1/labels', {
        name: 'Bug',
        color: 'red',
      });
    });

    it('updateLabel should put with provided fields', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { id: 'lbl1' } });

      const client = createClient();
      await client.updateLabel('lbl1', 'New Name', 'blue');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/labels/lbl1', {
        name: 'New Name',
        color: 'blue',
      });
    });

    it('updateLabel should only include defined fields', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { id: 'lbl1' } });

      const client = createClient();
      await client.updateLabel('lbl1', 'Name');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/labels/lbl1', { name: 'Name' });
    });

    it('deleteLabel should call delete', async () => {
      mockAxiosInstance.delete.mockResolvedValue({});

      const client = createClient();
      await client.deleteLabel('lbl1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/labels/lbl1');
    });
  });

  describe('copyCard', () => {
    it('should post with idCardSource and keepFromSource=all by default', async () => {
      const copiedCard = { id: 'c2', name: 'Copied Card' };
      mockAxiosInstance.post.mockResolvedValue({ data: copiedCard });

      const client = createClient();
      const result = await client.copyCard({
        sourceCardId: 'c1',
        listId: 'l1',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/cards', {
        idCardSource: 'c1',
        idList: 'l1',
        name: undefined,
        desc: undefined,
        keepFromSource: 'all',
        pos: undefined,
      });
      expect(result).toEqual(copiedCard);
    });

    it('should allow overriding name and keepFromSource', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'c2' } });

      const client = createClient();
      await client.copyCard({
        sourceCardId: 'c1',
        listId: 'l1',
        name: 'Custom Name',
        keepFromSource: 'checklists,labels',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/cards', {
        idCardSource: 'c1',
        idList: 'l1',
        name: 'Custom Name',
        desc: undefined,
        keepFromSource: 'checklists,labels',
        pos: undefined,
      });
    });
  });

  describe('copyChecklist', () => {
    it('should post with idChecklistSource', async () => {
      const checklist = { id: 'cl2', name: 'Copied', checkItems: [] };
      mockAxiosInstance.post.mockResolvedValue({ data: checklist });

      const client = createClient();
      const result = await client.copyChecklist({
        sourceChecklistId: 'cl1',
        cardId: 'c2',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/checklists', {
        idCard: 'c2',
        idChecklistSource: 'cl1',
        name: undefined,
        pos: undefined,
      });
      expect(result).toEqual(checklist);
    });

    it('should allow overriding name', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'cl2' } });

      const client = createClient();
      await client.copyChecklist({
        sourceChecklistId: 'cl1',
        cardId: 'c2',
        name: 'Renamed Checklist',
        pos: 'top',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/checklists', {
        idCard: 'c2',
        idChecklistSource: 'cl1',
        name: 'Renamed Checklist',
        pos: 'top',
      });
    });
  });

  describe('batchAddCards', () => {
    it('should create multiple cards sequentially', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { id: 'c1', name: 'Card 1' } })
        .mockResolvedValueOnce({ data: { id: 'c2', name: 'Card 2' } })
        .mockResolvedValueOnce({ data: { id: 'c3', name: 'Card 3' } });

      const client = createClient();
      const { created, errors } = await client.batchAddCards('l1', [
        { name: 'Card 1' },
        { name: 'Card 2', description: 'Desc' },
        { name: 'Card 3', labels: ['lbl1'] },
      ]);

      expect(created).toHaveLength(3);
      expect(errors).toHaveLength(0);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(created[0].name).toBe('Card 1');
      expect(created[2].name).toBe('Card 3');
    });

    it('should handle empty array', async () => {
      const client = createClient();
      const { created, errors } = await client.batchAddCards('l1', []);
      expect(created).toEqual([]);
      expect(errors).toEqual([]);
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should collect errors without aborting remaining cards', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { id: 'c1', name: 'Card 1' } })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ data: { id: 'c3', name: 'Card 3' } });

      const client = createClient();
      const { created, errors } = await client.batchAddCards('l1', [
        { name: 'Card 1' },
        { name: 'Card 2' },
        { name: 'Card 3' },
      ]);

      expect(created).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0].index).toBe(1);
      expect(errors[0].name).toBe('Card 2');
    });

    it('should reject when exceeding card limit', async () => {
      const client = createClient();
      const tooMany = Array.from({ length: 51 }, (_, i) => ({ name: `Card ${i}` }));
      await expect(client.batchAddCards('l1', tooMany)).rejects.toThrow('Cannot create more than 50');
    });
  });

  describe('getCard', () => {
    it('should fetch card with all fields', async () => {
      const card = { id: 'c1', name: 'Card', checklists: [], labels: [] };
      mockAxiosInstance.get.mockResolvedValue({ data: card });

      const client = createClient();
      await client.getCard('c1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/cards/c1', {
        params: expect.objectContaining({
          attachments: true,
          checklists: 'all',
          members: true,
          labels: true,
        }),
      });
    });
  });

  describe('getCardHistory', () => {
    it('should fetch card actions with optional params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const client = createClient();
      await client.getCardHistory('c1', 'commentCard', 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/cards/c1/actions', {
        params: { filter: 'commentCard', limit: 10 },
      });
    });

    it('should fetch without optional params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const client = createClient();
      await client.getCardHistory('c1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/cards/c1/actions', {
        params: {},
      });
    });
  });

  describe('Config persistence', () => {
    it('activeBoardId should return configured board', () => {
      const client = createClient({ boardId: 'b1' });
      expect(client.activeBoardId).toBe('b1');
    });

    it('activeBoardId should return undefined when not set', () => {
      const client = createClient();
      expect(client.activeBoardId).toBeUndefined();
    });
  });
});
