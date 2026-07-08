import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosInstance } from 'axios';
import { getCardChecklists } from '../../../src/trello/checklists.js';

function createAxiosMock(): AxiosInstance {
  const post = vi.fn().mockResolvedValue({ data: { id: 'a1' } });
  const get = vi.fn();
  return { post, get } as unknown as AxiosInstance;
}

describe('getCardChecklists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /cards/{cardId}/checklists with the given cardId', async () => {
    const axiosInstance = createAxiosMock();
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    await getCardChecklists(axiosInstance, 'card-123');

    expect(axiosInstance.get).toHaveBeenCalledWith('/cards/card-123/checklists');
  });

  it('maps each Trello checklist to the CheckList shape', async () => {
    const axiosInstance = createAxiosMock();
    const trelloChecklists = [
      {
        id: 'cl1',
        name: 'Tasks',
        idCard: 'card-123',
        pos: 1,
        checkItems: [
          { id: 'i1', name: 'First', state: 'complete', pos: 1 },
          { id: 'i2', name: 'Second', state: 'incomplete', pos: 2 },
        ],
      },
    ];
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: trelloChecklists,
    });

    const result = await getCardChecklists(axiosInstance, 'card-123');

    expect(result).toEqual([
      {
        id: 'cl1',
        name: 'Tasks',
        items: [
          { id: 'i1', text: 'First', complete: true, parentCheckListId: 'cl1' },
          { id: 'i2', text: 'Second', complete: false, parentCheckListId: 'cl1' },
        ],
        percentComplete: 50,
      },
    ]);
  });

  it('computes percentComplete as 100 when all items are complete', async () => {
    const axiosInstance = createAxiosMock();
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'cl1',
          name: 'Done',
          idCard: 'card-123',
          pos: 1,
          checkItems: [
            { id: 'i1', name: 'A', state: 'complete', pos: 1 },
            { id: 'i2', name: 'B', state: 'complete', pos: 2 },
          ],
        },
      ],
    });

    const result = await getCardChecklists(axiosInstance, 'card-123');

    expect(result[0].percentComplete).toBe(100);
  });

  it('yields percentComplete 0 when checkItems is an empty array', async () => {
    const axiosInstance = createAxiosMock();
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { id: 'cl1', name: 'Empty', idCard: 'card-123', pos: 1, checkItems: [] },
      ],
    });

    const result = await getCardChecklists(axiosInstance, 'card-123');

    expect(result[0].items).toEqual([]);
    expect(result[0].percentComplete).toBe(0);
  });

  it('does not throw when checkItems is undefined and yields items [] and percentComplete 0', async () => {
    const axiosInstance = createAxiosMock();
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: 'cl1', name: 'NoItems', idCard: 'card-123', pos: 1 }],
    });

    const result = await getCardChecklists(axiosInstance, 'card-123');

    expect(result[0].items).toEqual([]);
    expect(result[0].percentComplete).toBe(0);
  });
});
