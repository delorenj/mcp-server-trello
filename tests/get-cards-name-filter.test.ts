import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { TrelloClient } from '../src/trello-client.js';

const MOCK_CARDS = [
  { id: '1', name: 'FEAT: Add Slippage to Position History', desc: '', due: null, idList: 'list1', idLabels: [], closed: false, url: '', dateLastActivity: '' },
  { id: '2', name: 'FEAT: Execute trade slippage config', desc: '', due: null, idList: 'list1', idLabels: [], closed: false, url: '', dateLastActivity: '' },
  { id: '3', name: 'BUG: Fix login page crash', desc: '', due: null, idList: 'list1', idLabels: [], closed: false, url: '', dateLastActivity: '' },
  { id: '4', name: 'Add Slippage to Position History', desc: '', due: null, idList: 'list1', idLabels: [], closed: false, url: '', dateLastActivity: '' },
];

// Create a client and mock the axios instance's get method
function createMockedClient() {
  const client = new TrelloClient({ apiKey: 'fake', token: 'fake', boardId: 'board1' });
  // Replace the internal axios instance's get with a mock
  (client as any).axiosInstance = {
    get: mock(() => Promise.resolve({ data: MOCK_CARDS })),
  };
  return client;
}

describe('getCardsByList nameFilter', () => {
  let client: TrelloClient;

  beforeEach(() => {
    client = createMockedClient();
  });

  it('returns all cards when no nameFilter is provided', async () => {
    const cards = await client.getCardsByList('board1', 'list1');
    expect(cards).toHaveLength(4);
  });

  it('returns all cards when nameFilter is undefined', async () => {
    const cards = await client.getCardsByList('board1', 'list1', undefined);
    expect(cards).toHaveLength(4);
  });

  it('returns all cards when nameFilter is empty string', async () => {
    const cards = await client.getCardsByList('board1', 'list1', '');
    expect(cards).toHaveLength(4);
  });

  it('filters by exact name match', async () => {
    const cards = await client.getCardsByList('board1', 'list1', 'Add Slippage to Position History');
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.id)).toEqual(['1', '4']);
  });

  it('filters by substring match', async () => {
    const cards = await client.getCardsByList('board1', 'list1', 'FEAT');
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.id)).toEqual(['1', '2']);
  });

  it('filters case-insensitively', async () => {
    const cards = await client.getCardsByList('board1', 'list1', 'add slippage');
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.id)).toEqual(['1', '4']);
  });

  it('returns empty array when no cards match', async () => {
    const cards = await client.getCardsByList('board1', 'list1', 'nonexistent card name');
    expect(cards).toHaveLength(0);
  });

  it('does not match non-contiguous substrings', async () => {
    // "Add History" is not a contiguous substring of any card name
    const cards = await client.getCardsByList('board1', 'list1', 'Add History');
    expect(cards).toHaveLength(0);
  });
});
