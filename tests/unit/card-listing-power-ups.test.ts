import { describe, expect, it, vi } from 'vitest';
import { TrelloClient } from '../../src/trello-client.js';

const STORY_POINTS_PLUGIN = '638372c5e00ec1016bb45460';
const BOARD_A = 'board-a';

function storyPoints(points: number, idModel = 'card-1') {
  return [
    {
      id: `pd-${idModel}`,
      idPlugin: STORY_POINTS_PLUGIN,
      scope: 'card',
      idModel,
      value: `{"storyPoints":${points}}`,
      access: 'shared',
    },
  ];
}

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: 'card-1',
    name: 'Card 1',
    desc: '',
    due: null,
    idList: 'list-1',
    idLabels: [],
    closed: false,
    url: '',
    dateLastActivity: '',
    ...overrides,
  };
}

/** Routes GETs by path so each test only declares the endpoints it cares about. */
function createClient(routes: Record<string, unknown>) {
  const client = new TrelloClient({ apiKey: 'fake', token: 'fake' });
  const get = vi.fn((url: string) => {
    if (!(url in routes)) {
      return Promise.reject(new Error(`unexpected GET ${url}`));
    }
    const data = routes[url];
    return data instanceof Error ? Promise.reject(data) : Promise.resolve({ data });
  });
  (client as any).axiosInstance = { get };
  return { client, get };
}

const PLUGINS_A = [
  { id: STORY_POINTS_PLUGIN, name: 'Story Points' },
  { id: 'butler', name: 'Butler' },
];

describe('getCardsByList Power-Up resolution', () => {
  it('resolves plugin names using idBoard from the cards themselves', async () => {
    const { client, get } = createClient({
      '/lists/list-1/cards': [card({ idBoard: BOARD_A, pluginData: storyPoints(5) })],
      [`/boards/${BOARD_A}/plugins`]: PLUGINS_A,
    });

    const cards = await client.getCardsByList('list-1');

    expect(cards[0].powerUps).toEqual({ 'Story Points': { storyPoints: 5 } });
    expect(cards[0]).not.toHaveProperty('pluginData');
    expect(get).toHaveBeenCalledWith('/lists/list-1/cards', {
      params: { pluginData: true },
    });
  });

  it('costs no extra request when no card has Power-Up data', async () => {
    const { client, get } = createClient({
      '/lists/list-1/cards': [card({ idBoard: BOARD_A, pluginData: [] })],
    });

    const cards = await client.getCardsByList('list-1');

    expect(cards[0]).not.toHaveProperty('powerUps');
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('looks up the board when narrowed fields omit idBoard', async () => {
    const { client, get } = createClient({
      '/lists/list-1/cards': [card({ pluginData: storyPoints(2) })],
      '/lists/list-1': { id: 'list-1', idBoard: BOARD_A },
      [`/boards/${BOARD_A}/plugins`]: PLUGINS_A,
    });

    const cards = await client.getCardsByList('list-1', 'name,idShort');

    expect(cards[0].powerUps).toEqual({ 'Story Points': { storyPoints: 2 } });
    expect(get).toHaveBeenCalledWith('/lists/list-1', { params: { fields: 'idBoard' } });
  });

  it('skips the board lookup when the caller passes boardId', async () => {
    const { client, get } = createClient({
      '/lists/list-1/cards': [card({ pluginData: storyPoints(8) })],
      [`/boards/${BOARD_A}/plugins`]: PLUGINS_A,
    });

    const cards = await client.getCardsByList('list-1', 'name', undefined, BOARD_A);

    expect(cards[0].powerUps).toEqual({ 'Story Points': { storyPoints: 8 } });
    expect(get).not.toHaveBeenCalledWith('/lists/list-1', expect.anything());
  });

  it('still returns the data when the plugins lookup fails', async () => {
    const { client } = createClient({
      '/lists/list-1/cards': [card({ idBoard: BOARD_A, pluginData: storyPoints(3) })],
      [`/boards/${BOARD_A}/plugins`]: new Error('403 Forbidden'),
    });

    const cards = await client.getCardsByList('list-1');

    expect(cards[0].powerUps).toEqual({ [STORY_POINTS_PLUGIN]: { storyPoints: 3 } });
  });

  it('caches the plugin roster across calls', async () => {
    const { client, get } = createClient({
      '/lists/list-1/cards': [card({ idBoard: BOARD_A, pluginData: storyPoints(5) })],
      [`/boards/${BOARD_A}/plugins`]: PLUGINS_A,
    });

    await client.getCardsByList('list-1');
    await client.getCardsByList('list-1');

    expect(get.mock.calls.filter(([url]) => url === `/boards/${BOARD_A}/plugins`)).toHaveLength(1);
  });
});

describe('getMyCards Power-Up resolution', () => {
  it('resolves names per board across boards', async () => {
    const { client } = createClient({
      '/members/me/cards': [
        card({ id: 'c1', idBoard: BOARD_A, pluginData: storyPoints(5, 'c1') }),
        card({ id: 'c2', idBoard: 'board-b', pluginData: storyPoints(13, 'c2') }),
        card({ id: 'c3', idBoard: 'board-c', pluginData: [] }),
      ],
      [`/boards/${BOARD_A}/plugins`]: PLUGINS_A,
      '/boards/board-b/plugins': [{ id: STORY_POINTS_PLUGIN, name: 'Agile Points' }],
    });

    const cards = await client.getMyCards();

    expect(cards[0].powerUps).toEqual({ 'Story Points': { storyPoints: 5 } });
    expect(cards[1].powerUps).toEqual({ 'Agile Points': { storyPoints: 13 } });
    expect(cards[2]).not.toHaveProperty('powerUps');
  });
});
