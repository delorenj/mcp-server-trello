import { AxiosInstance } from 'axios';
import { TrelloCheckItem, TrelloChecklist, CheckList, CheckListItem } from '../types.js';

/**
 * Get all checklists from a card with their items
 */
export async function getCardChecklists(
  axiosInstance: AxiosInstance,
  cardId: string
): Promise<CheckList[]> {
  const response = await axiosInstance.get(`/cards/${cardId}/checklists`);
  const checklists: TrelloChecklist[] = response.data;

  return checklists.map((cl: TrelloChecklist) => ({
    id: cl.id,
    name: cl.name,
    items: (cl.checkItems || []).map((item: TrelloCheckItem) => ({
      id: item.id,
      text: item.name,
      complete: item.state === 'complete',
      parentCheckListId: cl.id,
    })),
    percentComplete: calculatePercentComplete(cl.checkItems || []),
  }));
}

function calculatePercentComplete(items: TrelloCheckItem[]): number {
  if (items.length === 0) return 0;
  const completed = items.filter((item) => item.state === 'complete').length;
  return Math.round((completed / items.length) * 100);
}
