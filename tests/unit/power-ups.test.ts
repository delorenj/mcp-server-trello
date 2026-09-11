import { describe, expect, it } from 'vitest';
import {
  parsePluginValue,
  resolvePowerUps,
  withResolvedPowerUps,
  hasCardScopedPluginData,
  boardsNeedingPluginNames,
} from '../../src/power-ups.js';
import type { TrelloPluginData } from '../../src/types.js';

const STORY_POINTS_PLUGIN = '638372c5e00ec1016bb45460';

function pluginData(overrides: Partial<TrelloPluginData> = {}): TrelloPluginData {
  return {
    id: 'pd-1',
    idPlugin: STORY_POINTS_PLUGIN,
    scope: 'card',
    idModel: 'card-1',
    value: '{"storyPoints":5}',
    access: 'shared',
    dateLastUpdated: '2026-07-02T17:43:09.665Z',
    ...overrides,
  };
}

const NAMES = new Map([[STORY_POINTS_PLUGIN, 'Story Points']]);

describe('parsePluginValue', () => {
  it('parses the JSON-encoded payload', () => {
    expect(parsePluginValue('{"storyPoints":5}')).toEqual({ storyPoints: 5 });
  });

  it('keeps the raw string when it is not JSON', () => {
    expect(parsePluginValue('not json')).toBe('not json');
  });

  it('passes through non-string values untouched', () => {
    expect(parsePluginValue(42)).toBe(42);
    expect(parsePluginValue(undefined)).toBeUndefined();
  });
});

describe('resolvePowerUps', () => {
  it('keys the parsed payload by plugin name', () => {
    expect(resolvePowerUps([pluginData()], NAMES)).toEqual({
      'Story Points': { storyPoints: 5 },
    });
  });

  it('falls back to idPlugin when the plugin name is unknown', () => {
    expect(resolvePowerUps([pluginData()], new Map())).toEqual({
      [STORY_POINTS_PLUGIN]: { storyPoints: 5 },
    });
  });

  it('does not merge two plugins that share a name', () => {
    const entries = [
      pluginData(),
      pluginData({ id: 'pd-2', idPlugin: 'other-plugin', value: '{"storyPoints":8}' }),
    ];
    const names = new Map([
      [STORY_POINTS_PLUGIN, 'Story Points'],
      ['other-plugin', 'Story Points'],
    ]);

    expect(resolvePowerUps(entries, names)).toEqual({
      'Story Points': { storyPoints: 5 },
      'other-plugin': { storyPoints: 8 },
    });
  });

  it('ignores board-scoped plugin config', () => {
    expect(resolvePowerUps([pluginData({ scope: 'board' })], NAMES)).toBeUndefined();
  });

  it('returns undefined when there is no plugin data', () => {
    expect(resolvePowerUps([], NAMES)).toBeUndefined();
    expect(resolvePowerUps(undefined, NAMES)).toBeUndefined();
  });
});

describe('withResolvedPowerUps', () => {
  it('replaces pluginData with powerUps, resolved per board', () => {
    const cards = [
      { id: 'c1', idBoard: 'board-a', pluginData: [pluginData()] },
      { id: 'c2', idBoard: 'board-b', pluginData: [pluginData({ value: '{"storyPoints":3}' })] },
    ];
    const namesByBoard = new Map([
      ['board-a', NAMES],
      ['board-b', new Map()],
    ]);

    expect(withResolvedPowerUps(cards, namesByBoard)).toEqual([
      { id: 'c1', idBoard: 'board-a', powerUps: { 'Story Points': { storyPoints: 5 } } },
      { id: 'c2', idBoard: 'board-b', powerUps: { [STORY_POINTS_PLUGIN]: { storyPoints: 3 } } },
    ]);
  });

  it('uses the fallback board when cards carry no idBoard', () => {
    const cards = [{ id: 'c1', pluginData: [pluginData()] }];
    const namesByBoard = new Map([['board-a', NAMES]]);

    expect(withResolvedPowerUps(cards, namesByBoard, 'board-a')).toEqual([
      { id: 'c1', powerUps: { 'Story Points': { storyPoints: 5 } } },
    ]);
  });

  it('drops empty pluginData without adding a powerUps key', () => {
    expect(withResolvedPowerUps([{ id: 'c1', pluginData: [] }], new Map())).toEqual([{ id: 'c1' }]);
  });
});

describe('boardsNeedingPluginNames', () => {
  it('lists only boards with card-scoped data, deduplicated', () => {
    const cards = [
      { idBoard: 'board-a', pluginData: [pluginData()] },
      { idBoard: 'board-a', pluginData: [pluginData({ id: 'pd-2' })] },
      { idBoard: 'board-b', pluginData: [] },
      { idBoard: 'board-c', pluginData: [pluginData({ scope: 'board' })] },
    ];

    expect(boardsNeedingPluginNames(cards)).toEqual(['board-a']);
  });

  it('attributes boardless cards to the fallback board', () => {
    expect(boardsNeedingPluginNames([{ pluginData: [pluginData()] }], 'board-a')).toEqual([
      'board-a',
    ]);
  });
});

describe('hasCardScopedPluginData', () => {
  it('distinguishes card-scoped data from board config and empties', () => {
    expect(hasCardScopedPluginData([{ pluginData: [pluginData()] }])).toBe(true);
    expect(hasCardScopedPluginData([{ pluginData: [pluginData({ scope: 'board' })] }])).toBe(false);
    expect(hasCardScopedPluginData([{ pluginData: [] }, {}])).toBe(false);
  });
});
