import { describe, it, expect, beforeAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TEST_BOARD_ID = process.env.TRELLO_TEST_BOARD_ID || '698bd319de70fa4f7a3c7ccd';

const canRunSmoke = Boolean(TRELLO_API_KEY && TRELLO_TOKEN);

/**
 * Helper to communicate with the MCP server over stdio JSON-RPC.
 */
class McpTestClient {
  private server: ChildProcess;
  private buffer = '';
  private requestId = 0;
  private pending = new Map<number, (msg: any) => void>();

  constructor() {
    this.server = spawn('node', [path.resolve('build/index.js')], {
      env: {
        ...process.env,
        TRELLO_API_KEY,
        TRELLO_TOKEN,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.server.stdout!.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop()!;
      for (const line of lines) {
        if (line.trim()) {
          try {
            const msg = JSON.parse(line);
            if (msg.id && this.pending.has(msg.id)) {
              this.pending.get(msg.id)!(msg);
              this.pending.delete(msg.id);
            }
          } catch {
            // ignore non-JSON lines
          }
        }
      }
    });
  }

  async initialize(): Promise<void> {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'smoke-test', version: '1.0.0' },
    });
    this.server.stdin!.write(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'
    );
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<any> {
    const response = await this.request('tools/call', { name, arguments: args });
    if (response.result?.isError) {
      throw new Error(response.result.content[0]?.text || 'Tool call failed');
    }
    const text = response.result.content[0].text;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private request(method: string, params: Record<string, unknown>): Promise<any> {
    return new Promise((resolve) => {
      const id = ++this.requestId;
      this.pending.set(id, resolve);
      this.server.stdin!.write(
        JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'
      );
    });
  }

  close(): void {
    this.server.kill();
  }
}

describe.skipIf(!canRunSmoke)('Smoke Tests (Live Trello API)', () => {
  let client: McpTestClient;
  let testListId: string;

  // Track created resources for cleanup
  const createdCardIds: string[] = [];

  beforeAll(async () => {
    client = new McpTestClient();
    await client.initialize();

    // Ensure test list exists
    const lists = await client.callTool('get_lists', { boardId: TEST_BOARD_ID });
    if (lists.length > 0) {
      testListId = lists[0].id;
    } else {
      const newList = await client.callTool('add_list_to_board', {
        boardId: TEST_BOARD_ID,
        name: 'Smoke Test List',
      });
      testListId = newList.id;
    }
  });

  afterAll(async () => {
    // Archive cards created during tests
    for (const cardId of createdCardIds) {
      try {
        await client.callTool('archive_card', { cardId });
      } catch {
        // Ignore cleanup errors
      }
    }
    client?.close();
  });

  describe('Board operations', () => {
    it('should list boards', async () => {
      const boards = await client.callTool('list_boards');
      expect(Array.isArray(boards)).toBe(true);
      expect(boards.length).toBeGreaterThan(0);
      expect(boards[0]).toHaveProperty('id');
      expect(boards[0]).toHaveProperty('name');
    });

    it('should get lists from test board', async () => {
      const lists = await client.callTool('get_lists', { boardId: TEST_BOARD_ID });
      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length).toBeGreaterThan(0);
    });

    it('should set and get active board', async () => {
      const setResult = await client.callTool('set_active_board', { boardId: TEST_BOARD_ID });
      expect(typeof setResult).toBe('string'); // returns plain text confirmation
      const info = await client.callTool('get_active_board_info');
      expect(info.id).toBe(TEST_BOARD_ID);
    });
  });

  describe('Card CRUD', () => {
    let cardId: string;

    it('should create a card', async () => {
      const card = await client.callTool('add_card_to_list', {
        listId: testListId,
        name: 'Smoke Test Card',
        description: 'Created by smoke test',
      });
      expect(card).toHaveProperty('id');
      expect(card.name).toBe('Smoke Test Card');
      cardId = card.id;
      createdCardIds.push(cardId);
    });

    it('should get card details', async () => {
      const card = await client.callTool('get_card', { cardId });
      expect(card.id).toBe(cardId);
      expect(card.name).toBe('Smoke Test Card');
      expect(card.desc).toBe('Created by smoke test');
    });

    it('should update card', async () => {
      const updated = await client.callTool('update_card_details', {
        cardId,
        name: 'Updated Smoke Card',
        description: 'Updated by smoke test',
      });
      expect(updated.name).toBe('Updated Smoke Card');
    });

    it('should get cards by list', async () => {
      const cards = await client.callTool('get_cards_by_list_id', { listId: testListId });
      expect(Array.isArray(cards)).toBe(true);
      const found = cards.find((c: any) => c.id === cardId);
      expect(found).toBeTruthy();
    });

    it('should archive card', async () => {
      const archived = await client.callTool('archive_card', { cardId });
      expect(archived.closed).toBe(true);
      // Remove from cleanup since already archived
      const idx = createdCardIds.indexOf(cardId);
      if (idx > -1) createdCardIds.splice(idx, 1);
    });
  });

  describe('Checklist operations', () => {
    let cardId: string;
    let checklistId: string;

    beforeAll(async () => {
      const card = await client.callTool('add_card_to_list', {
        listId: testListId,
        name: 'Checklist Test Card',
      });
      cardId = card.id;
      createdCardIds.push(cardId);
    });

    it('should create a checklist', async () => {
      const checklist = await client.callTool('create_checklist', {
        cardId,
        name: 'Test Checklist',
      });
      expect(checklist).toHaveProperty('id');
      expect(checklist.name).toBe('Test Checklist');
      checklistId = checklist.id;
    });

    it('should add items to checklist', async () => {
      const item = await client.callTool('add_checklist_item', {
        cardId,
        checkListName: 'Test Checklist',
        text: 'Test Item 1',
      });
      expect(item).toHaveProperty('id');
      expect(item.text).toBe('Test Item 1');
    });

    it('should get checklist by name', async () => {
      const checklist = await client.callTool('get_checklist_by_name', {
        cardId,
        name: 'Test Checklist',
      });
      expect(checklist.name).toBe('Test Checklist');
      expect(checklist.items.length).toBeGreaterThan(0);
    });

    it('should get checklist items', async () => {
      const items = await client.callTool('get_checklist_items', {
        cardId,
        name: 'Test Checklist',
      });
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('text');
    });
  });

  describe('Comment operations', () => {
    let cardId: string;
    let commentId: string;

    beforeAll(async () => {
      const card = await client.callTool('add_card_to_list', {
        listId: testListId,
        name: 'Comment Test Card',
      });
      cardId = card.id;
      createdCardIds.push(cardId);
    });

    it('should add a comment', async () => {
      const comment = await client.callTool('add_comment', {
        cardId,
        text: 'Smoke test comment',
      });
      expect(comment).toHaveProperty('id');
      commentId = comment.id;
    });

    it('should get card comments', async () => {
      const comments = await client.callTool('get_card_comments', { cardId });
      expect(Array.isArray(comments)).toBe(true);
      expect(comments.length).toBeGreaterThan(0);
    });

    it('should delete a comment', async () => {
      const result = await client.callTool('delete_comment', { commentId });
      expect(result).toBe('success');
    });
  });

  describe('copy_card', () => {
    let sourceCardId: string;

    beforeAll(async () => {
      const card = await client.callTool('add_card_to_list', {
        listId: testListId,
        name: 'Copy Source Card',
        description: 'This card will be copied',
      });
      sourceCardId = card.id;
      createdCardIds.push(sourceCardId);
    });

    it('should copy a card with all properties', async () => {
      const copied = await client.callTool('copy_card', {
        sourceCardId,
        listId: testListId,
        keepFromSource: 'all',
      });
      expect(copied).toHaveProperty('id');
      expect(copied.id).not.toBe(sourceCardId);
      expect(copied.name).toBe('Copy Source Card');
      createdCardIds.push(copied.id);
    });

    it('should copy a card with custom name', async () => {
      const copied = await client.callTool('copy_card', {
        sourceCardId,
        listId: testListId,
        name: 'Renamed Copy',
      });
      expect(copied.name).toBe('Renamed Copy');
      createdCardIds.push(copied.id);
    });

    it('should copy with selective keepFromSource', async () => {
      const copied = await client.callTool('copy_card', {
        sourceCardId,
        listId: testListId,
        keepFromSource: 'due,labels',
      });
      expect(copied).toHaveProperty('id');
      createdCardIds.push(copied.id);
    });
  });

  describe('copy_checklist', () => {
    let sourceCardId: string;
    let destCardId: string;
    let checklistId: string;

    beforeAll(async () => {
      const [srcCard, dstCard] = await Promise.all([
        client.callTool('add_card_to_list', {
          listId: testListId,
          name: 'Checklist Copy Source',
        }),
        client.callTool('add_card_to_list', {
          listId: testListId,
          name: 'Checklist Copy Dest',
        }),
      ]);
      sourceCardId = srcCard.id;
      destCardId = dstCard.id;
      createdCardIds.push(sourceCardId, destCardId);

      // Create checklist with items on source
      const cl = await client.callTool('create_checklist', {
        cardId: sourceCardId,
        name: 'Source Checklist',
      });
      checklistId = cl.id;

      await client.callTool('add_checklist_item', {
        cardId: sourceCardId,
        checkListName: 'Source Checklist',
        text: 'Item A',
      });
      await client.callTool('add_checklist_item', {
        cardId: sourceCardId,
        checkListName: 'Source Checklist',
        text: 'Item B',
      });
    });

    it('should copy checklist to another card', async () => {
      const copied = await client.callTool('copy_checklist', {
        sourceChecklistId: checklistId,
        cardId: destCardId,
      });
      expect(copied).toHaveProperty('id');
      expect(copied.id).not.toBe(checklistId);
      expect(copied.name).toBe('Source Checklist');
      expect(copied.checkItems).toHaveLength(2);
    });

    it('should copy checklist with custom name', async () => {
      const copied = await client.callTool('copy_checklist', {
        sourceChecklistId: checklistId,
        cardId: destCardId,
        name: 'Renamed Checklist',
      });
      expect(copied.name).toBe('Renamed Checklist');
    });
  });

  describe('add_cards_to_list', () => {
    it('should create multiple cards', async () => {
      const result = await client.callTool('add_cards_to_list', {
        listId: testListId,
        cards: [
          { name: 'Batch 1', description: 'First' },
          { name: 'Batch 2', description: 'Second' },
          { name: 'Batch 3' },
        ],
      });
      expect(result.created).toBe(3);
      expect(result.cards).toHaveLength(3);
      expect(result.cards[0].name).toBe('Batch 1');
      expect(result.cards[1].name).toBe('Batch 2');
      expect(result.cards[2].name).toBe('Batch 3');
      result.cards.forEach((c: any) => createdCardIds.push(c.id));
    });

    it('should handle single card in batch', async () => {
      const result = await client.callTool('add_cards_to_list', {
        listId: testListId,
        cards: [{ name: 'Single Batch Card' }],
      });
      expect(result.created).toBe(1);
      createdCardIds.push(result.cards[0].id);
    });
  });

  describe('Label operations', () => {
    let labelId: string;

    it('should get board labels', async () => {
      const labels = await client.callTool('get_board_labels', { boardId: TEST_BOARD_ID });
      expect(Array.isArray(labels)).toBe(true);
    });

    it('should create a label', async () => {
      const label = await client.callTool('create_label', {
        boardId: TEST_BOARD_ID,
        name: 'Smoke Test Label',
        color: 'green',
      });
      expect(label).toHaveProperty('id');
      expect(label.name).toBe('Smoke Test Label');
      labelId = label.id;
    });

    it('should update a label', async () => {
      const updated = await client.callTool('update_label', {
        labelId,
        name: 'Updated Label',
        color: 'blue',
      });
      expect(updated.name).toBe('Updated Label');
    });

    it('should delete a label', async () => {
      const result = await client.callTool('delete_label', { labelId });
      expect(result).toBe('Label deleted successfully');
    });
  });
});
