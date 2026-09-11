import type { TrelloPluginData, PowerUpValues } from './types.js';

/**
 * Trello returns Power-Up data on cards as opaque records: the plugin is
 * identified only by `idPlugin`, and the payload is a JSON-encoded *string*.
 * The helpers here turn that into a compact `powerUps` object keyed by the
 * human plugin name, e.g. `{ "Story Points": { storyPoints: 5 } }`.
 */

/** Cards carry board-scoped plugin config too; that repeats per card and is noise in a listing. */
function isCardScoped(entry: TrelloPluginData): boolean {
  return entry.scope === undefined || entry.scope === 'card';
}

/** `value` is a JSON string in practice, but plugins are free to store anything. */
export function parsePluginValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Collapse a card's `pluginData` into `powerUps`, keyed by plugin name.
 * Falls back to `idPlugin` as the key when the name is unknown (plugin list
 * unavailable) or already taken, so no data is silently merged away.
 */
export function resolvePowerUps(
  pluginData: TrelloPluginData[] | undefined,
  pluginNames: Map<string, string>
): PowerUpValues | undefined {
  const entries = (pluginData ?? []).filter(isCardScoped);
  if (entries.length === 0) {
    return undefined;
  }

  const powerUps: PowerUpValues = {};
  for (const entry of entries) {
    const name = pluginNames.get(entry.idPlugin);
    const key = name && !(name in powerUps) ? name : entry.idPlugin;
    powerUps[key] = parsePluginValue(entry.value);
  }
  return powerUps;
}

/**
 * Replace `pluginData` with the resolved `powerUps` on each card. The raw
 * records are dropped: they cost ~250 bytes per card against ~35 resolved.
 */
export function withResolvedPowerUps<
  T extends { idBoard?: string; pluginData?: TrelloPluginData[] },
>(
  cards: T[],
  pluginNamesByBoard: Map<string, Map<string, string>>,
  fallbackBoardId?: string
): Array<Omit<T, 'pluginData'> & { powerUps?: PowerUpValues }> {
  return cards.map(card => {
    const { pluginData, ...rest } = card;
    const boardId = card.idBoard ?? fallbackBoardId;
    const names = (boardId && pluginNamesByBoard.get(boardId)) || EMPTY_NAMES;
    const powerUps = resolvePowerUps(pluginData, names);
    return powerUps ? { ...rest, powerUps } : (rest as Omit<T, 'pluginData'>);
  });
}

const EMPTY_NAMES: Map<string, string> = new Map();

/** Whether any card carries card-scoped plugin data worth resolving. */
export function hasCardScopedPluginData(
  cards: Array<{ pluginData?: TrelloPluginData[] }>
): boolean {
  return cards.some(card => (card.pluginData ?? []).some(isCardScoped));
}

/** Boards that actually have card-scoped plugin data — the only ones worth a plugins lookup. */
export function boardsNeedingPluginNames(
  cards: Array<{ idBoard?: string; pluginData?: TrelloPluginData[] }>,
  fallbackBoardId?: string
): string[] {
  const boardIds = new Set<string>();
  for (const card of cards) {
    if (!(card.pluginData ?? []).some(isCardScoped)) {
      continue;
    }
    const boardId = card.idBoard ?? fallbackBoardId;
    if (boardId) {
      boardIds.add(boardId);
    }
  }
  return [...boardIds];
}
