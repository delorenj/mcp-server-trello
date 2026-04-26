import { describe, expect, test } from 'bun:test';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TrelloClient } from '../src/trello-client.js';

function createClient() {
  return new TrelloClient({
    apiKey: 'test-key',
    token: 'test-token',
  });
}

describe('TrelloClient checklist item mutations', () => {
  test('updateChecklistItem sends supported Trello fields to the card checkItem endpoint', async () => {
    const client = createClient();
    const putCalls: Array<{ url: string; body: unknown }> = [];

    (client as any).axiosInstance = {
      put: async (url: string, body: unknown) => {
        putCalls.push({ url, body });
        return {
          data: {
            id: 'check-item-1',
            name: 'Renamed item',
            state: 'complete',
            pos: 42,
            due: '2026-04-20T10:00:00.000Z',
            dueReminder: 60,
            idMember: 'member-1',
          },
        };
      },
    };

    const item = await client.updateChecklistItem('card-1', 'check-item-1', {
      name: 'Renamed item',
      state: 'complete',
      pos: 42,
      due: '2026-04-20T10:00:00.000Z',
      dueReminder: 60,
      idMember: 'member-1',
    });

    expect(putCalls).toEqual([
      {
        url: '/cards/card-1/checkItem/check-item-1',
        body: {
          name: 'Renamed item',
          state: 'complete',
          pos: 42,
          due: '2026-04-20T10:00:00.000Z',
          dueReminder: 60,
          idMember: 'member-1',
        },
      },
    ]);
    expect(item.name).toBe('Renamed item');
    expect(item.idMember).toBe('member-1');
  });

  test('updateChecklistItem rejects requests with no changes', async () => {
    const client = createClient();

    await expect(client.updateChecklistItem('card-1', 'check-item-1', {})).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
    } satisfies Partial<McpError>);
  });

  test('deleteChecklistItem deletes the item from the card endpoint', async () => {
    const client = createClient();
    const deleteCalls: string[] = [];

    (client as any).axiosInstance = {
      delete: async (url: string) => {
        deleteCalls.push(url);
        return { status: 200 };
      },
    };

    const deleted = await client.deleteChecklistItem('card-1', 'check-item-1');

    expect(deleteCalls).toEqual(['/cards/card-1/checkItem/check-item-1']);
    expect(deleted).toBe(true);
  });
});
