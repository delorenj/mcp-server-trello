# MCPS-2 — Independent Adversarial Spec-Compliance Review

> **NOTE ON THIS FILE:** When I arrived, this path held an in-progress placeholder written by a
> *different* reviewer instance identifying as `mcps2-spec-reviewer-2` ("Status: IN PROGRESS —
> do not act on this yet"). I overwrote it with this completed report, as instructed. If a second
> reviewer is still in flight, it may clobber this file when it finishes. This report is authored by
> `mcps2-spec-reviewer` (see identity line at the bottom). Check the identity line before acting.

**Ticket:** MCPS-2 — `get_acceptance_criteria` alias tolerance + honest not-found
**Repo:** `/home/delorenj/code/mcp-server-trello`
**Branch:** `feat/mcps-2-ac-heading-tolerance`
**Diff under review:** `41bc3481904568c806341471972c525230a40877` → `7fda3d9`, paths `src/ tests/`
**Review status:** COMPLETE. Every claim below is verified by reading the diff, running the checks, or mutation testing. Nothing is reconstructed from memory or taken from an implementer's summary.

---

## 1. VERDICT

`❌ issues found`

Both issues are **low severity** and neither breaks a stated acceptance criterion. **All six ACs pass.** The core implementation is correct, and the tests are demonstrably non-vacuous: I built 14 mutants of the implementation and the new tests **killed 12 of them**. The 2 survivors are the basis of Issue #1.

If the close gate keys on "do AC1–AC6 hold" — they hold. The two findings are (a) a test-coverage gap on a spec-stated formula where the implementation itself is correct, and (b) stale human-facing docs outside the reviewed path.

---

## 2. AC-by-AC

| AC | Result | Proving test / command | Why the proof is non-vacuous |
|---|---|---|---|
| **AC1** — checklist named `"AC"` → items returned, `matchedChecklistName: "AC"` | **PASS** | `should match a checklist named "AC" and report its board spelling` — `tests/unit/trello-client.test.ts:478` | Strict `toEqual` on the entire result object, not a partial match. A mutant reverting matching to exact `'Acceptance Criteria'` **killed** it. The assertions require real conversion work (`state:'complete'` → `complete: boolean`, `name` → `text`), so the test cannot be satisfied by echoing the mock payload. |
| **AC2** — same for `"DoD"`, `"Definition of Done"`, and mixed-case | **PASS** | `should match "DoD"` — `:501`; `should match "Definition of Done"` — `:510`; `should match mixed-case and padded alias spellings without canonicalizing the name` — `:523` | The revert-to-exact-match mutant **killed all four**. Additionally: a mutant removing `.trim()` from `normalize` **killed `:523` specifically**, proving trimming is genuinely exercised; a mutant returning the canonical `alias` instead of the board name **also killed `:523`**, proving board-casing is genuinely asserted. |
| **AC3** — 4 items / 2 complete → `percentComplete: 50`, exactly the 2 incomplete in `unmet` | **PASS** | `should compute percentComplete and unmet for 4 items with 2 complete` — `:536` | Asserts `result.unmet.map(item => item.text)` `toEqual(['two','four'])` — identity **and** order, not merely a count. A mutant inverting the `unmet` predicate (`item.complete` instead of `!item.complete`) **killed** it. Also asserts `unmet.every(i => i.complete === false)`. |
| **AC4** — `["Backlog","QA"]`, no alias match → `found:false`, human-readable `reason`, `availableChecklists: ["Backlog","QA"]` | **PASS** | `should return an explicit not-found with the checklists that do exist` — `:556` | Asserts exact `availableChecklists` array, presence of all four alias strings inside `reason`, `/card/` scope wording, **and** `expect(result).not.toHaveProperty('items')` (proving the not-found shape does not leak a bare list). Mutants forcing `availableChecklists: []` and a generic scope-less reason **both killed** it. Against the OLD implementation this fails outright: `[].found` is `undefined`, so `expect(result.found).toBe(false)` fails. |
| **AC5** — alias-named checklist with zero items → `found:true`, `items:[]`, `unmet:[]`, `percentComplete:0`, provably distinct from AC4 | **PASS** | `should distinguish a matched-but-empty checklist from not-found` — `:584` | Strict `toEqual` including `percentComplete: 0`, plus an explicit `expect(empty).not.toEqual(missing)` where `missing` is a **live not-found result computed in the same test** — so distinctness is proven against real output, not asserted by hand. A mutant removing the `items.length === 0 ? 0 : …` guard (yielding `NaN`) **killed** it, confirming divide-by-zero is genuinely handled rather than accidentally avoided. |
| **AC6** — `grep -c "registerTool(" src/index.ts` = 57 and `npm run typecheck` clean | **PASS** | `grep -c "registerTool(" src/index.ts` → `57`; `npm run typecheck` → exit 0, no diagnostics | Direct command output (verbatim in §6). I additionally verified the **base** commit `41bc348` also reports `57`, so this is genuinely "zero new tools" and not a coincidental match against an unknown baseline. |

### Supplementary verification beyond the AC table

- **Board-scoped path is genuinely alias-tolerant.** `should resolve aliases on the board-scoped path with an explicit boardId` (`:634`) uses `Definition of Done` and asserts the URL `/boards/board123/checklists`; `should fall back to the active board and report board scope in the not-found reason` (`:656`) covers the active-board fallback. A mutant that made the board path exact-match-only **killed both**. The hypothesis "only the card path was fixed" is refuted.
- **The `McpError` for "no card, no board, no active board" still fires.** `should throw when neither a card, a board, nor an active board is available` (`:668`) asserts both the message and `expect(mockAxiosInstance.get).not.toHaveBeenCalled()`. A mutant replacing the throw with `return []` **killed** it.
- **Scope wording genuinely discriminates.** `reason.toMatch(/card/)` and `reason.toContain('board')` are not vacuous: the card-scope string contains no substring `"board"`, and the board-scope string contains no substring `"card"`. Confirmed by reading both template literals at `src/trello-client.ts:854-861`.
- **Full suite green:** 154 passed / 26 skipped / 0 failed.

---

## 3. Answers to the four specific questions

### (1) Precedence — real, and the fixture is adversarially ordered

**Confirmed, not refuted.** `src/trello-client.ts:836-838` loops the **alias list outer** and filters checklists **inner**:

```ts
for (const alias of ACCEPTANCE_CRITERIA_ALIASES) {
  const matching = checklists.filter(
    checklist => normalize(checklist.name || '') === normalize(alias)
  );
  if (matching.length === 0) continue;
```

That is true alias precedence, not array-order-first-match.

The fixture at `tests/unit/trello-client.test.ts:605-609`, quoted verbatim:

```ts
mockCardChecklists([
  checklist('cl1', 'DoD', [['dod item', false]]),
  checklist('cl2', 'AC', [['ac item', false]]),
  checklist('cl3', 'Acceptance Criteria', [['canonical item', false]]),
]);
```

The higher-precedence checklist (`Acceptance Criteria`) is **last** in the array; `DoD` is **first**. A naive array-order implementation returns `DoD` and **fails** this test. The fixture does *not* happen to list the higher-precedence checklist first — it is deliberately ordered to catch exactly the bug you were worried about. **This test proves something.**

I confirmed this empirically rather than by inspection alone: I built a mutant that iterates checklists and takes the first one matching any alias, and it **killed** this test (1 failed / 12 passed).

Assertions at `:613-615`:
```ts
expect(result).toMatchObject({ found: true, matchedChecklistName: 'Acceptance Criteria' });
if (!result.found) throw new Error('expected found');
expect(result.items.map(item => item.text)).toEqual(['canonical item']);
```
The `items` assertion also proves the losing aliases' items are **excluded**, not merged.

### (2) `matchedChecklistName` casing — board's raw spelling, padding included

**Yes, it asserts the raw board spelling.** Fixture and assertion at `:524-528`, quoted verbatim:

```ts
mockCardChecklists([checklist('cl1', '  dod  ', [['reviewed', false]])]);

const result = await createClient().getAcceptanceCriteria('c1');

expect(result).toMatchObject({ found: true, matchedChecklistName: '  dod  ' });
```

The expected value is `'  dod  '` — **untrimmed and lowercase**, i.e. exactly as written on the board. It is neither the canonical `'DoD'` nor a trimmed `'dod'`. This single assertion simultaneously proves two things: that trimming happens on the **comparison** side (otherwise `'  dod  '` would never match the `DoD` alias and the result would be `found: false`), and that trimming does **not** happen on the **returned name**.

Second assertion at `:530-532`:
```ts
mockCardChecklists([checklist('cl2', 'acceptance CRITERIA', [['reviewed', false]])]);
const mixed = await createClient().getAcceptanceCriteria('c1');
expect(mixed).toMatchObject({ found: true, matchedChecklistName: 'acceptance CRITERIA' });
```

Both a `.trim()`-removal mutant and a canonical-name mutant (`matchedChecklistName: alias`) **killed** this test. The canonical-vs-board-cased distinction is genuinely asserted.

### (3) Aggregation — asserts ORDER, not just membership

**Order.** `:628-631`, quoted verbatim:

```ts
expect(result.matchedChecklistName).toBe('ac');
expect(result.items.map(item => item.text)).toEqual(['first', 'second']);
expect(result.items.map(item => item.parentCheckListId)).toEqual(['cl1', 'cl2']);
expect(result.percentComplete).toBe(50);
```

`toEqual` on a mapped array is order-sensitive, so `['first','second']` pins sequence. The `parentCheckListId` assertion is the stronger one: it proves the two items came from **two distinct checklists in API order** (`cl1` then `cl2`), not from one checklist duplicated or from an unordered merge. The fixture (`:619-623`) is `['ac' (cl1), 'AC' (cl2), 'DoD' (cl3)]`, so it also proves the losing alias `DoD` is excluded, and that `matchedChecklistName` is the **first** checklist matching the winning alias in its own board casing (`'ac'`, lowercase).

A mutant restricting aggregation to `matching.slice(0, 1)` **killed** this test.

### (4) `resolveChecklistsInScope` single-use; `getChecklistItems` behaviorally untouched

**Both confirmed.**

`grep -n "resolveChecklistsInScope"` across all of `src/` returns exactly two hits:
```
src/trello-client.ts:794:  private async resolveChecklistsInScope(   <- definition
src/trello-client.ts:834:    const checklists = await this.resolveChecklistsInScope(cardId, boardId);   <- sole call site, inside getAcceptanceCriteria
```
No other method calls it. It is `private`, so it cannot be reached from outside the class either.

`getChecklistItems` is **byte-identical** between base and head. Brace-matched extraction of the full method body hashes identically at both commits:
```
41bc348 (base)  sha256 90b3259f484adca3…  1232 chars
7fda3d9 (head)  sha256 90b3259f484adca3…  1232 chars
```
The only `getChecklistItems`-related line the diff touches is its removal as a *callee* of the old one-line implementation:
```
-    return this.getChecklistItems('Acceptance Criteria', cardId, boardId);
```
The other methods that inline the same scope-resolution block (`addChecklistItem`, `findChecklistItemsByDescription`, `getChecklistByName`) are likewise untouched. No other checklist tool changed behavior.

---

## 4. Issues

### [LOW] `Math.round` is specified but never discriminated from `floor`/`ceil`
**Location:** `src/trello-client.ts:849`; affected tests `:536`, `:584`, `:618`, `:634`

Every `percentComplete` assertion in the suite uses a value that rounds exactly: `0`, `50`, `50`, `50`. I mutated `Math.round` → `Math.floor`, and separately `Math.round` → `Math.ceil`. **Both mutants SURVIVED — 13/13 tests still passed.**

The implementation as written is **correct** (`Math.round`, matching requirement 3 exactly). This is a test-coverage gap on a spec-stated formula, not a behavior defect, and AC3's literal bar ("4 items / 2 complete → 50") is met. A future refactor could silently regress the rounding mode with no test failure.

**Closes with:** one fixture where the three modes diverge — e.g. 2 of 3 complete → `67` under round, `66` under floor, `67` under ceil; or 1 of 3 → `33` / `33` / `34`. A pair of those pins all three modes.

**Violates:** nothing in AC1–AC6; weakens requirement 3's `Math.round` clause.
**Severity:** low.

### [LOW] README still documents the old contract
**Location:** `README.md:270`

Reads *"Get all items from the 'Acceptance Criteria' checklist"* with only a `boardId` argument documented. It does not mention the alias set, the `{ found, items, unmet, percentComplete, matchedChecklistName }` success shape, the `{ found, reason, availableChecklists }` not-found shape, or the `cardId` parameter (that last omission predates this change).

Outside the stated `src/ tests/` review scope and not required by any AC, but the shipped human docs now misdescribe the tool's return type. **The model-facing surface is correct** — the MCP tool description at `src/index.ts:1180` is accurate, complete, and describes aliases, precedence, both result shapes, and the matched-but-empty case. So agent behavior is unaffected; only human readers are misled.

**Violates:** no AC.
**Severity:** low.

### Considered and deliberately NOT reported as defects

Recorded so the reasoning is auditable rather than silently dropped:

- **Untrimmed `matchedChecklistName`** (`'  dod  '` returned verbatim). Matches the spec's "actual board-cased name … as written on the board" literally, and the test asserts it on purpose. Intentional, correct.
- **`resolveChecklistsInScope` duplicates scope logic** already inlined in `getChecklistItems`, `addChecklistItem`, `findChecklistItemsByDescription`. Refactoring those was an **explicit non-goal**, so leaving the duplication is the *compliant* choice, not laziness.
- **`src/health/*` has no unit tests.** The caller adaptation rests on typecheck alone. Under `strict` mode this is a *sound* proof of the discriminated-union narrowing — `.items` is unreachable without first narrowing on `.found`. The runtime equivalence (`found:false → 0` matches the old `[].length`) is trivially readable at `health-endpoints.ts:264` and `health-monitor.ts:382`. Not worth a finding.
- **`vi.clearAllMocks()` does not reset `mockResolvedValue` implementations** (only `mockReset` does), so a test forgetting to set its mock would silently inherit the prior test's data. I checked all 13 new tests: every one sets its own mock via `mockCardChecklists`/`mockBoardChecklists`. No latent flake.
- **`availableChecklists` maps `checklist.name` unguarded**, so a name-less checklist would yield `undefined` in a `string[]`. The `TrelloChecklist` type declares `name: string`, and the match path guards with `checklist.name || ''`. Theoretical only; not worth a finding.

### Behavior change worth awareness (not a defect)

The health checks now report a **nonzero** acceptance-criteria count for a board whose checklist is named `"AC"`/`"DoD"`, where they previously reported `0`. Under the old contract that was the `[]` case — indistinguishable from "none exist." This is precisely the ticket's purpose and a strict improvement in truthfulness. The genuine not-found case still maps to `0`, preserving old behavior exactly.

---

## 5. Scope drift

**None.**

- `registerTool(` = **57** at both base and head → genuinely zero new tools.
- **No fuzzy/partial/regex/semantic matching.** `normalize()` is `name.trim().toLowerCase()` and comparison is `===` (`src/trello-client.ts:835-838`). No `includes`, no `startsWith`, no `RegExp`, no similarity scoring.
- **No user-supplied heading/name override parameter.** The tool's `inputSchema` is unchanged — `cardId` and `boardId` only. The diff to `src/index.ts` touches only the `description` string and one local variable rename (`items` → `result`).
- **No renames.** `getAcceptanceCriteria` keeps its name and positional signature `(cardId?, boardId?)`.
- **No changes to `getChecklistItems`** or any other checklist tool — verified byte-identical by hash (see §3.4).
- `ACCEPTANCE_CRITERIA_ALIASES` is a new **public export**, the only added surface. It is the spec's own alias list and is consumed by the not-found `reason` construction. Implementation detail made visible, not capability expansion. Not drift.

---

## 6. Check output (literal)

```
$ npm run typecheck
npm notice run @delorenj/mcp-server-trello@1.8.0 typecheck
npm notice run tsc --noEmit
(no diagnostics; exit 0)
```

```
$ npx vitest run tests/unit
npm notice run @delorenj/mcp-server-trello@1.8.0 npx
npm notice run 'vitest' run tests/unit

 RUN  v4.1.5 /home/delorenj/code/mcp-server-trello


 Test Files  8 passed (8)
      Tests  141 passed (141)
   Start at  13:16:20
   Duration  271ms (transform 390ms, setup 0ms, import 697ms, tests 155ms, environment 0ms)
```

```
$ grep -c "registerTool(" src/index.ts
57
```

### Supplementary (not requested, run for corroboration)

```
$ git show 41bc3481904568c806341471972c525230a40877:src/index.ts | grep -c "registerTool("
57
```

```
$ npm test
npm notice run @delorenj/mcp-server-trello@1.8.0 test
npm notice run vitest run

 RUN  v4.1.5 /home/delorenj/code/mcp-server-trello


 Test Files  9 passed | 1 skipped (10)
      Tests  154 passed | 26 skipped (180)
   Start at  13:18:58
   Duration  286ms (transform 536ms, setup 0ms, import 972ms, tests 175ms, environment 1ms)
```

```
$ npm run lint
npm error Missing script: "lint"
```
(No `lint` script exists in this package — not a regression, and not in scope.)

---

## Appendix — mutation testing ledger

Fourteen mutants applied to a throwaway `git archive` export of `7fda3d9` at `/tmp/mcps2-mut` (since deleted). Each was run against `npx vitest run tests/unit/trello-client.test.ts -t "getAcceptanceCriteria"` (13 tests).

| # | Mutation | Result | Tests killed |
|---|---|---|---|
| M1 | Iterate checklists in array order, take first matching any alias (defeats precedence) | **KILLED** | `:604` precedence |
| M2 | `normalize` drops `.trim()` | **KILLED** | `:523` mixed-case/padded |
| M3 | `matchedChecklistName: alias` (canonical instead of board casing) | **KILLED** | `:523`, `:618` |
| M4 | Remove `items.length === 0 ? 0 :` guard (→ `NaN`) | **KILLED** | `:584` empty vs not-found |
| M5 | Aggregate only `matching.slice(0,1)` | **KILLED** | `:618` aggregation |
| M6 | Always return `found:true` with empty items (silent-empty regression) | **KILLED** | `:556`, `:575`, `:584`, `:656` |
| M7 | Board path filtered to exact `'Acceptance Criteria'` only | **KILLED** | `:634`, `:656` |
| M8 | `unmet` = complete subset (inverted predicate) | **KILLED** | `:478`, `:536`, `:634` |
| M9 | `Math.floor` instead of `Math.round` | **SURVIVED** | — (Issue #1) |
| M10 | `Math.ceil` instead of `Math.round` | **SURVIVED** | — (Issue #1) |
| M11 | Return `[]` instead of throwing `McpError` when no scope | **KILLED** | `:668` |
| M12 | `availableChecklists: []` always | **KILLED** | `:556`, `:656` |
| M13 | Revert to old exact `'Acceptance Criteria'` matching | **KILLED** | 7 of 13 tests |
| M14 | Generic `reason` with no scope word | **KILLED** | `:556`, `:656` |

**Kill rate: 12/14 (86%).** The two survivors are the same rounding-mode gap, reported as Issue #1.

---

## Integrity statement

No repository file was modified at any point during this review. All mutation testing was performed on a throwaway `git archive` export at `/tmp/mcps2-mut`, which has been deleted. `git status --porcelain -- src/ tests/` returns empty. This report file is the only write performed.

This review was actually executed — the diff was read line by line, the three checks were run and their output captured verbatim, and the non-vacuity claims are backed by the mutation ledger above rather than by inspection alone.

---

**Reviewer identity:** `mcps2-spec-reviewer (Agent tool, general-purpose, claude-opus-5[1m])`
