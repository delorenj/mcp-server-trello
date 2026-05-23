import { describe, expect, it } from 'vitest';
import { formatCardListResponse } from '../../src/card-list-preview.js';
import type { TrelloCard } from '../../src/types.js';

function card(overrides: Partial<TrelloCard> = {}): TrelloCard {
  return {
    id: 'card-1',
    name: 'Card 1',
    desc: 'short description',
    due: null,
    idList: 'list-1',
    idLabels: [],
    closed: false,
    url: 'https://trello.example/card-1',
    dateLastActivity: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('formatCardListResponse', () => {
  it('truncates long descriptions and returns a separate notice', () => {
    const response = formatCardListResponse([card({ desc: 'abcdef' })], {
      descMaxLength: 5,
    });

    const cards = JSON.parse(response.content[0].text);
    expect(cards[0].desc).toBe('ab...');
    expect(response.content[1].text).toContain('Some descriptions were truncated');
  });

  it('allows callers to opt into longer descriptions', () => {
    const response = formatCardListResponse([card({ desc: 'abcdef' })], {
      descMaxLength: 20,
    });

    const cards = JSON.parse(response.content[0].text);
    expect(cards[0].desc).toBe('abcdef');
    expect(response.content).toHaveLength(1);
  });

  it('omits descriptions when the serialized response exceeds the threshold', () => {
    const response = formatCardListResponse([card({ desc: 'abcdef' })], {
      descMaxLength: 20,
      omitDescThresholdBytes: 1,
    });

    const cards = JSON.parse(response.content[0].text);
    expect(cards[0]).not.toHaveProperty('desc');
    expect(response.content[1].text).toContain('Descriptions omitted');
  });
});
