import type { TrelloCard } from './types.js';

const DEFAULT_DESC_MAX_LENGTH = 200;
const DEFAULT_OMIT_DESC_THRESHOLD_BYTES = 50000;

type TextContent = { type: 'text'; text: string };

export function formatCardListResponse(
  cards: TrelloCard[],
  options: {
    descMaxLength?: number;
    omitDescThresholdBytes?: number;
  } = {}
): { content: TextContent[] } {
  const descMaxLength = options.descMaxLength ?? DEFAULT_DESC_MAX_LENGTH;
  const omitDescThresholdBytes =
    options.omitDescThresholdBytes ?? DEFAULT_OMIT_DESC_THRESHOLD_BYTES;

  let anyTruncated = false;
  const previewCards = cards.map((card) => {
    if (!card.desc || card.desc.length <= descMaxLength) {
      return card;
    }

    anyTruncated = true;
    const suffix = descMaxLength >= 3 ? '...' : '';
    const sliceLength = Math.max(0, descMaxLength - suffix.length);
    return { ...card, desc: `${card.desc.slice(0, sliceLength)}${suffix}` };
  });

  let resultCards: Array<TrelloCard | Omit<TrelloCard, 'desc'>> = previewCards;
  let descriptionsOmitted = false;
  let result = JSON.stringify(resultCards, null, 2);

  if (Buffer.byteLength(result, 'utf8') > omitDescThresholdBytes) {
    resultCards = cards.map(({ desc, ...rest }) => rest);
    result = JSON.stringify(resultCards, null, 2);
    descriptionsOmitted = true;
  }

  const content: TextContent[] = [{ type: 'text', text: result }];

  if (descriptionsOmitted) {
    content.push({
      type: 'text',
      text: 'Descriptions omitted due to response size. Use get_card with a specific cardId for full details, or request fields without desc when listing cards.',
    });
  } else if (anyTruncated) {
    content.push({
      type: 'text',
      text: 'Some descriptions were truncated. Use get_card with a specific cardId for full details, or increase descMaxLength for a longer preview.',
    });
  }

  return { content };
}
