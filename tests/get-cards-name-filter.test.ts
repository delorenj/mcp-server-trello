import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { TrelloClient } from '../src/trello-client.js';

const MOCK_CARDS = [
  {
    id: '1',
    name: 'FEAT: Add Slippage to Position History',
    desc: '',
    due: null,
    idList: 'list1',
    idLabels: [],
    closed: false,
    url: '',
    dateLastActivity: '',
  },
  {
    id: '2',
    name: 'FEAT: Execute trade slippage config',
    desc: '',
    due: null,
    idList: 'list1',
    idLabels: [],
    closed: false,
    url: '',
    dateLastActivity: '',
  },
  {
    id: '3',
    name: 'BUG: Fix login page crash',
    desc: '',
    due: null,
    idList: 'list1',
    idLabels: [],
    closed: false,
    url: '',
    dateLastActivity: '',
  },
  {
    id: '4',
    name: 'Add Slippage to Position History',
    desc: '',
    due: null,
    idList: 'list1',
    idLabels: [],
    closed: false,
    url: '',
    dateLastActivity: '',
  },
];

// Create a client and mock the axios instance's get method
function createMockedClient() {
  const client = new TrelloClient({ apiKey: 'fake', token: 'fake', boardId: 'board1' });
  // Replace the internal axios instance's get with a mock
  (client as any).axiosInstance = {
    get: vi.fn(() => Promise.resolve({ data: MOCK_CARDS })),
  };
  return client;
}

// Mirror the schema from index.ts for validation tests
const nameFilterSchema = z.string().trim().min(1, 'nameFilter must not be empty').optional();

describe('nameFilter schema validation', () => {
  it('accepts undefined', () => {
    expect(nameFilterSchema.parse(undefined)).toBeUndefined();
  });

  it('rejects empty string', () => {
    expect(() => nameFilterSchema.parse('')).toThrow();
  });

  it('rejects whitespace-only string', () => {
    expect(() => nameFilterSchema.parse('   ')).toThrow();
  });

  it('accepts valid string', () => {
    expect(nameFilterSchema.parse('FEAT')).toBe('FEAT');
  });

  it('trims whitespace from valid string', () => {
    expect(nameFilterSchema.parse('  FEAT  ')).toBe('FEAT');
  });
});

describe('getCardsByList nameFilter', () => {
  let client: TrelloClient;

  beforeEach(() => {
    client = createMockedClient();
  });

  it('returns all cards when no nameFilter is provided', async () => {
    const cards = await client.getCardsByList('list1');
    expect(cards).toHaveLength(4);
  });

  it('returns all cards when nameFilter is undefined', async () => {
    const cards = await client.getCardsByList('list1', undefined, undefined);
    expect(cards).toHaveLength(4);
  });

  it('filters by exact name match', async () => {
    const cards = await client.getCardsByList(
      'list1',
      undefined,
      'Add Slippage to Position History'
    );
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.id)).toEqual(['1', '4']);
  });

  it('filters by substring match', async () => {
    const cards = await client.getCardsByList('list1', undefined, 'FEAT');
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.id)).toEqual(['1', '2']);
  });

  it('filters case-insensitively', async () => {
    const cards = await client.getCardsByList('list1', undefined, 'add slippage');
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.id)).toEqual(['1', '4']);
  });

  it('returns empty array when no cards match', async () => {
    const cards = await client.getCardsByList('list1', undefined, 'nonexistent card name');
    expect(cards).toHaveLength(0);
  });

  it('does not match non-contiguous substrings', async () => {
    // "Add History" is not a contiguous substring of any card name
    const cards = await client.getCardsByList('list1', undefined, 'Add History');
    expect(cards).toHaveLength(0);
  });

  it('passes requested fields while filtering by name', async () => {
    const cards = await client.getCardsByList('list1', 'name,idList', 'FEAT');
    expect(cards).toHaveLength(2);
    expect((client as any).axiosInstance.get).toHaveBeenCalledWith('/lists/list1/cards', {
      params: { fields: 'name,idList' },
    });
  });
});
