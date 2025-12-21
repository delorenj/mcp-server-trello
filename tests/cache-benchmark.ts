/**
 * Cache Performance Benchmark
 *
 * Measures the performance improvement from caching by:
 * 1. Simulating API call patterns with cache disabled
 * 2. Simulating the same patterns with cache enabled
 * 3. Comparing hit rates and response times
 *
 * Run with: bun run tests/cache-benchmark.ts
 */

import { TrelloCacheManager, CachePrefix, resetCacheManager } from '../src/cache-manager';

interface BenchmarkResult {
  scenario: string;
  totalCalls: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgTimeMs: number;
  totalTimeMs: number;
  estimatedApiCallsSaved: number;
}

// Simulate API call delay (typical Trello API latency)
const SIMULATED_API_LATENCY_MS = 150;

async function simulateApiCall<T>(data: T): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_API_LATENCY_MS));
  return data;
}

async function runScenario(
  name: string,
  cacheEnabled: boolean,
  operations: (cache: TrelloCacheManager) => Promise<void>
): Promise<BenchmarkResult> {
  // Reset environment
  resetCacheManager();
  if (!cacheEnabled) {
    process.env.TRELLO_CACHE_ENABLED = 'false';
  } else {
    delete process.env.TRELLO_CACHE_ENABLED;
  }

  const cache = new TrelloCacheManager();
  const startTime = performance.now();

  // Run operations with the cache instance
  await operations(cache);

  const endTime = performance.now();
  const stats = cache.getStats();

  return {
    scenario: name,
    totalCalls: stats.hits + stats.misses,
    cacheHits: stats.hits,
    cacheMisses: stats.misses,
    hitRate: stats.hitRate,
    avgTimeMs: (endTime - startTime) / (stats.hits + stats.misses || 1),
    totalTimeMs: endTime - startTime,
    estimatedApiCallsSaved: stats.hits,
  };
}

// Scenario 1: Typical session - browsing boards and lists
async function scenarioBrowsingSession(cache: TrelloCacheManager): Promise<void> {
  const mockBoards = [{ id: 'board1', name: 'Board 1' }, { id: 'board2', name: 'Board 2' }];
  const mockLists = [{ id: 'list1', name: 'To Do' }, { id: 'list2', name: 'Doing' }];

  // User opens app - fetches boards (3 times during session)
  for (let i = 0; i < 3; i++) {
    let boards = cache.get<typeof mockBoards>(CachePrefix.BOARDS, 'all');
    if (!boards) {
      boards = await simulateApiCall(mockBoards);
      cache.set(CachePrefix.BOARDS, boards, 'all');
    }
  }

  // User views each board's lists (2 times each)
  for (const board of mockBoards) {
    for (let i = 0; i < 2; i++) {
      let lists = cache.get<typeof mockLists>(CachePrefix.LISTS, board.id);
      if (!lists) {
        lists = await simulateApiCall(mockLists);
        cache.set(CachePrefix.LISTS, lists, board.id);
      }
    }
  }
}

// Scenario 2: Card-heavy workflow - viewing many cards
async function scenarioCardWorkflow(cache: TrelloCacheManager): Promise<void> {
  const mockCards = Array.from({ length: 10 }, (_, i) => ({ id: `card${i}`, name: `Card ${i}` }));
  const listId = 'list1';

  // Fetch cards in list (5 times - user refreshes view)
  for (let i = 0; i < 5; i++) {
    let cards = cache.get<typeof mockCards>(CachePrefix.CARDS_BY_LIST, listId);
    if (!cards) {
      cards = await simulateApiCall(mockCards);
      cache.set(CachePrefix.CARDS_BY_LIST, cards, listId);
    }
  }

  // View individual card details (3 views per card)
  for (const card of mockCards) {
    for (let i = 0; i < 3; i++) {
      let cardData = cache.get<typeof card>(CachePrefix.CARD, card.id);
      if (!cardData) {
        cardData = await simulateApiCall(card);
        cache.set(CachePrefix.CARD, cardData, card.id);
      }
    }
  }
}

// Scenario 3: Labels and members - frequently accessed metadata
async function scenarioMetadataAccess(cache: TrelloCacheManager): Promise<void> {
  const mockLabels = [{ id: 'l1', name: 'Bug' }, { id: 'l2', name: 'Feature' }];
  const mockMembers = [{ id: 'm1', name: 'User 1' }, { id: 'm2', name: 'User 2' }];
  const boardId = 'board1';

  // Labels accessed frequently for dropdown menus
  for (let i = 0; i < 10; i++) {
    let labels = cache.get<typeof mockLabels>(CachePrefix.BOARD_LABELS, boardId);
    if (!labels) {
      labels = await simulateApiCall(mockLabels);
      cache.set(CachePrefix.BOARD_LABELS, labels, boardId);
    }
  }

  // Members accessed for assignment dropdowns
  for (let i = 0; i < 8; i++) {
    let members = cache.get<typeof mockMembers>(CachePrefix.BOARD_MEMBERS, boardId);
    if (!members) {
      members = await simulateApiCall(mockMembers);
      cache.set(CachePrefix.BOARD_MEMBERS, members, boardId);
    }
  }
}

// Scenario 4: Mixed workflow with writes (cache invalidation)
async function scenarioMixedWithWrites(cache: TrelloCacheManager): Promise<void> {
  const mockCard = { id: 'card1', name: 'Task 1' };
  const mockCards = [mockCard];
  const listId = 'list1';

  // Read cards
  for (let i = 0; i < 3; i++) {
    let cards = cache.get<typeof mockCards>(CachePrefix.CARDS_BY_LIST, listId);
    if (!cards) {
      cards = await simulateApiCall(mockCards);
      cache.set(CachePrefix.CARDS_BY_LIST, cards, listId);
    }
  }

  // Update card (invalidates cache)
  await simulateApiCall({ ...mockCard, name: 'Updated Task' });
  cache.invalidateCard(mockCard.id, listId);

  // Read cards again after invalidation
  for (let i = 0; i < 3; i++) {
    let cards = cache.get<typeof mockCards>(CachePrefix.CARDS_BY_LIST, listId);
    if (!cards) {
      cards = await simulateApiCall(mockCards);
      cache.set(CachePrefix.CARDS_BY_LIST, cards, listId);
    }
  }

  // Read individual card
  for (let i = 0; i < 4; i++) {
    let card = cache.get<typeof mockCard>(CachePrefix.CARD, mockCard.id);
    if (!card) {
      card = await simulateApiCall(mockCard);
      cache.set(CachePrefix.CARD, card, mockCard.id);
    }
  }
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('CACHE PERFORMANCE BENCHMARK RESULTS');
  console.log('='.repeat(80));
  console.log(`Simulated API latency: ${SIMULATED_API_LATENCY_MS}ms per call\n`);

  for (const result of results) {
    console.log(`\n--- ${result.scenario} ---`);
    console.log(`  Total operations:     ${result.totalCalls}`);
    console.log(`  Cache hits:           ${result.cacheHits}`);
    console.log(`  Cache misses:         ${result.cacheMisses}`);
    console.log(`  Hit rate:             ${(result.hitRate * 100).toFixed(1)}%`);
    console.log(`  Total time:           ${result.totalTimeMs.toFixed(0)}ms`);
    console.log(`  API calls saved:      ${result.estimatedApiCallsSaved}`);
    console.log(`  Time saved (est.):    ${(result.estimatedApiCallsSaved * SIMULATED_API_LATENCY_MS).toFixed(0)}ms`);
  }

  // Summary
  const totalHits = results.reduce((sum, r) => sum + r.cacheHits, 0);
  const totalOps = results.reduce((sum, r) => sum + r.totalCalls, 0);
  const totalTimeSaved = totalHits * SIMULATED_API_LATENCY_MS;

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Total operations across all scenarios: ${totalOps}`);
  console.log(`  Total cache hits:                      ${totalHits}`);
  console.log(`  Overall hit rate:                      ${((totalHits / totalOps) * 100).toFixed(1)}%`);
  console.log(`  Total API calls saved:                 ${totalHits}`);
  console.log(`  Estimated time saved:                  ${totalTimeSaved}ms (${(totalTimeSaved / 1000).toFixed(1)}s)`);
  console.log('='.repeat(80) + '\n');
}

async function main(): Promise<void> {
  console.log('Starting cache performance benchmark...\n');

  // Clean environment
  delete process.env.TRELLO_CACHE_ENABLED;
  resetCacheManager();

  const results: BenchmarkResult[] = [];

  // Run each scenario with caching enabled
  console.log('Running: Browsing Session...');
  results.push(await runScenario(
    'Browsing Session (boards & lists)',
    true,
    scenarioBrowsingSession
  ));

  console.log('Running: Card Workflow...');
  results.push(await runScenario(
    'Card Workflow (viewing cards)',
    true,
    scenarioCardWorkflow
  ));

  console.log('Running: Metadata Access...');
  results.push(await runScenario(
    'Metadata Access (labels & members)',
    true,
    scenarioMetadataAccess
  ));

  console.log('Running: Mixed with Writes...');
  results.push(await runScenario(
    'Mixed Workflow (with cache invalidation)',
    true,
    scenarioMixedWithWrites
  ));

  printResults(results);
}

main().catch(console.error);
