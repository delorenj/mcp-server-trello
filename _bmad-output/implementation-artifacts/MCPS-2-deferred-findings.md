# MCPS-2 — deferred findings (follow-up ticket candidates)

Findings raised by the two independent MCPS-2 review gates that were **deliberately
excluded** from the MCPS-2 fix round, with the reasoning for deferring each. Captured here
so they survive the session; they still need to be filed as tickets via the
`project-lifecycle` skill (the `tp` adapter is read/comment/transition only — it has no
`create_issue`).

- Source reviews: `issue-reviews/MCPS-2.gate1-spec-review.md`, `issue-reviews/MCPS-2.gate2-quality-review.md`
- Reviewed diff: `41bc3481904568c806341471972c525230a40877` → `7fda3d9`
- Deferral decision recorded in `bloodbank-events.jsonl` (basis: `smallest-safe-increment`,
  `evidence-over-status`, `independent-adversarial-review`, `keep-the-pipeline-unblocked`)

---

## D1 — Factor the five-copy scope-resolution block (Important)

The card-vs-board checklist resolution block (card fetch, `activeConfig.boardId` fallback,
`McpError`) now appears **five** times in `src/trello-client.ts`:

| Line | Method |
|---|---|
| `:670` | `getChecklistItems` |
| `:710` | `addChecklistItem` |
| `:755` | `findChecklistItemsByDescription` |
| `:878` | `getChecklistByName` |
| `:794` | `resolveChecklistsInScope` *(added by MCPS-2)* |

**Why deferred:** touching `getChecklistItems` was an explicit MCPS-2 non-goal. The Gate 1
reviewer's position — that leaving the duplication is the *compliant* choice rather than
laziness — is correct for MCPS-2's scope.

**Why it is still worth doing:** the Gate 2 reviewer diffed the helper against the inline
block line by line and found the card path, the `McpError` code, and its message string all
identical. The single delta is the board path: the helper returns `response.data || []`
where the inline version assigns `response.data` unguarded. That delta is reachable only on
a 200 response with a null body, where today's code throws
`TypeError: checklists is not iterable`. No test asserts that `TypeError` and no caller can
depend on it.

**Proposed change:** in each of the four sibling methods, delete the
`let checklists: TrelloChecklist[];` declaration and the if/else block, replacing with
`const checklists = await this.resolveChecklistsInScope(cardId, boardId);`. Everything
downstream is untouched; the existing suite is the safety net. Do **not** add an options
flag to preserve the null-body `TypeError` bit-for-bit.

## D2 — Preserve the found/not-found distinction in the health surface (Important)

`src/health/health-monitor.ts:394` reports `acceptance_criteria_count: 0` for both "no AC
checklist exists" and "the AC checklist exists and is empty." The client can now distinguish
these; the health output discards the distinction — reintroducing, one layer up, exactly the
ambiguity MCPS-2 removed at the tool boundary.

**Fix:** add `acceptance_criteria_found: criteria.found` to the `metadata` object at
`health-monitor.ts:394`, and the equivalent to `results.statistics` at
`health-endpoints.ts:264`. Both are free-form bags, so no schema break.

**Why deferred:** the Gate 1 reviewer independently judged the health change a strict
improvement in truthfulness as it stands, and `src/health/` was outside MCPS-2's stated
scope. Genuine reviewer disagreement — worth an operator decision rather than a silent
in-flight expansion.

**Note:** keep `HealthStatus.HEALTHY`. A board with no acceptance-criteria checklist is a
fact about board content, not about server health. Both reviewers agree on this.

## D3 — Cover the defensive guards added by MCPS-2 (Important, cheap)

Four guards added in the MCPS-2 diff have zero test coverage, because the `checklist()`
factory at `tests/unit/trello-client.test.ts:452` always emits a well-formed `checkItems`
array:

- `checklist.name || ''` — `src/trello-client.ts:839`
- `checklist.checkItems || []` — `src/trello-client.ts:844`
- `cardResponse.data.checklists || []` — `src/trello-client.ts:801`
- `response.data || []` — `src/trello-client.ts:816`

**Fix:** two cases — a checklist object with no `checkItems` key, and a board response of
`{data: null}`. Both should be non-throwing.

**Calibration:** the Gate 2 reviewer rated the absent-`checkItems` scenario the most
plausible in production, reasoning that the card and board endpoints have different default
field sets. That risk is **weaker than stated** — the pre-MCPS-2 `getChecklistItems` called
`checklist.checkItems.map(...)` unguarded on *both* paths and shipped, which demonstrates
both endpoints hydrate the field. Worth a test; not urgent.

## D4 — Resolve the half-guarded `name` contradiction (Minor)

`src/trello-client.ts:839` guards with `checklist.name || ''` while `:853`
(`matchedChecklistName: matching[0].name`) and `:865`
(`availableChecklists: checklists.map(c => c.name)`) trust the field completely. One file,
two contradictory assumptions about the same field. All four sibling methods do a bare
`checklist.name.toLowerCase()` with no guard.

`src/types.ts:128` declares `TrelloChecklist.name: string` (non-optional), so this is
theoretical today. Both reviewers agree it is not a real defect.

**Fix:** drop the `|| ''` at `:839`, resolving the contradiction toward the repo's existing
convention. **If** the team believes the name really can be null, the *type* is wrong
(`name: string | null`) and all four siblings are latent crashes — a substantially larger
finding that should be filed separately.

## D5 — `unmet` duplicates a subset of `items` in the serialized payload (Minor)

`src/index.ts:1196` stringifies the whole result, so every incomplete item is emitted twice.
A 20-item checklist with 15 unmet serializes 35 item objects instead of 20 — roughly 75%
larger on a token-metered surface.

**Why deferred:** `unmet` was an explicit MCPS-2 acceptance criterion (AC3), so changing it
is a product decision, not a code-quality fix. `unmetCount` plus letting the agent filter
`items` would be cheaper if the payload size proves to matter.

## D6 — Test hygiene (Minor)

- `tests/unit/trello-client.test.ts:523` packs two scenarios into one `it` (asserts on
  `'  dod  '`, re-mocks mid-test, asserts on `'acceptance CRITERIA'`). On failure you cannot
  tell which spelling broke. Split, or use `it.each`.
- Narrowing boilerplate `if (!result.found) throw new Error('expected found')` repeats at
  `:549, 565, 614, 627, 652, 664`. A local
  `function assertFound(r: AcceptanceCriteriaResult): asserts r is AcceptanceCriteriaFound`
  collapses all six. (Worth noting this repetition is also the clearest available evidence
  on consumer ergonomics: narrowing the union is *safe* — zero casts across all six — but
  not *free*.)
- `src/health/health-monitor.ts:383` materializes an intermediate array while
  `health-endpoints.ts:264` uses a ternary on `.length`. Functionally identical, two shapes
  for one decision.

## D7 — Repo-wide: checklist methods bypass `handleRequest` (Minor, inherited)

`resolveChecklistsInScope` does not route through `handleRequest` (`src/trello-client.ts:205`),
so `get_acceptance_criteria` gets no 429 retry/backoff and surfaces raw axios errors instead
of `McpError`. **Inherited, not introduced** — all four sibling checklist methods do the
same, and the old delegation was equally unwrapped, so MCPS-2 changed error behavior not at
all. Natural to bundle with D1, since both touch the same five methods.

## D8 — Out of scope, pre-existing: stale generated skill asset

`skill/assets/source/src/index.ts:972` still carries the old tool description. It is
generated by `scripts/build-skill-assets.sh` and was already ~300 lines behind (1571 vs
1879) *before* MCPS-2 — and ~55 lines out of date on `trello-client.ts` at base `41bc348`.
MCPS-2 widens the divergence by one method plus the description change. Regenerating it is
its own task; do not charge it to MCPS-2.

## D9 — Product-doctrine skill quotes the superseded method body (Minor)

`.agents/skills/mcp-server-trello-product-doctrine/SKILL.md:167` still quotes the old
one-line `getAcceptanceCriteria` implementation
(`return this.getChecklistItems('Acceptance Criteria', cardId, boardId)`) as its evidence
that the fix is "~5 lines, highest value-per-line in the repo." That evidence is now
historical: the work is done. The doctrine text should be updated so it stops pointing at a
body that no longer exists, and so the Tier 0 item is marked shipped rather than open.

Surfaced by the implementer during the fix round; deliberately left untouched because it is
doctrine prose outside the ticket's file allowlist.

## D10 — README code blocks are indented with non-breaking spaces (Minor, pre-existing)

`README.md` uses U+00A0 rather than ASCII spaces for indentation inside its TypeScript code
blocks, throughout the file. Anyone copy-pasting a snippet out of the README gets invalid
whitespace in their editor.

This predates MCPS-2. It forced the fix round to perform its README edit byte-exactly via a
script (with an `assert count == 1` guard) rather than a normal string edit, and to match
the NBSP convention in the new lines so the section stays internally consistent.

**Fix:** normalize U+00A0 → ASCII space repo-wide in `README.md`. Deliberately deferred —
doing it inside MCPS-2 would have buried a three-line semantic diff in whitespace churn.

## D14 — ⛔ BLOCKS RELEASE — the shipped skill bundle now contradicts its own shipped docs

**This is a regression introduced by MCPS-2, not pre-existing staleness. Resolve it before this
branch merges or releases.**

`skill/scripts/install.sh:8,13-21` builds the server from `skill/assets/source/` whenever Bun is
present — the primary install path (README:53 confirms). That vendored snapshot still carries the
**old** implementation:

```
skill/assets/source/src/trello-client.ts:747
  async getAcceptanceCriteria(cardId?, boardId?): Promise<CheckListItem[]> {
    return this.getChecklistItems('Acceptance Criteria', cardId, boardId);
  }
```

Meanwhile `c5b97b4` updated `skill/references/trello-mcp/patterns.md` to instruct agents to check
`found` and, when false, read `reason` / `availableChecklists`.

**The failure is worst in the common case.** For a checklist named literally `"Acceptance Criteria"`,
the bundled build returns a populated **array**. `found` is `undefined` on an array, therefore falsy,
so an agent following the new `patterns.md` takes the not-found branch and **discards real acceptance
criteria it successfully fetched**, then reports `reason`/`availableChecklists` as `undefined`. A
working read becomes a confidently wrong "no criteria, and I cannot tell you why" — precisely the
lie-by-omission this ticket exists to eliminate.

**Why this is genuinely new:** the final reviewer verified the bundle was *consistent* with `api.md`
before this diff — all 49 tools `api.md` documented exist in the vendored `index.ts`, and the old
`api.md` line described the bundled behavior exactly. This diff creates the first **behavioral**
contradiction. The reviewer also found that `skill/assets/source/src/health/health-monitor.ts` was
byte-identical to `src/health/health-monitor.ts` at base and now differs — the one vendored file this
change knocked out of a previously-synced state.

**It does not self-heal.** Verified: the refresh lives only in `mise.toml` (`[tasks.package]`, and
`[tasks.ci]`); **no GitHub workflow runs `scripts/build-skill-assets.sh`**.

**Fix:** `mise run package` regenerates the snapshot from `src/` and closes this entirely.

**Why it was not done inside MCPS-2, and what the operator must decide:** regenerating also drags the
bundle from its 1.7.1-era state (51 registered tools) to current (57), changing what skill-installed
users receive in ways wholly unrelated to acceptance criteria. Shipping a 51→57 tool jump inside a
heading-tolerance ticket would be exactly the "pulls later work into now" the drift rubric calls
significant. So the regeneration deserves its own ticket and its own review — but it **must** land
before this branch reaches users, and it pairs naturally with the D11 version decision, since both
are release-time calls.

## D15 — `acceptance_criteria_found` has a third state that reads as `false` (Low)

When the checklist probe throws, `statistics.acceptance_criteria_found` is never assigned, so the key
is **absent** from the JSON. A consumer writing `if (!stats.acceptance_criteria_found)` conflates
"health check errored" with "no AC checklist exists" — the very ambiguity the field was added to
kill. Consumers must test key *presence*, not truthiness. Interacts with D12; fix them together.

## D16 — `ACCEPTANCE_CRITERIA_ALIASES` is exported with no importer (Nit)

A grep across `src/` and `tests/` finds only the declaration. Dead public surface — either import it
where the alias list is needed, or drop the `export`.

## D17 — README wording on `matchedChecklistName` is imprecise (Nit)

Documented as "the checklist name as written on the board, original casing." It also preserves
surrounding **whitespace** — `tests/unit/trello-client.test.ts:528` asserts `'  dod  '` comes back
verbatim, padding included. "Verbatim" is more precise than "original casing."

## D12 — `checklist_note` misreports transport failures as "checklist not found" (real bug, pre-existing)

`src/health/health-endpoints.ts:269-270`:

```ts
} catch (error) {
  results.statistics.checklist_note = 'Acceptance Criteria checklist not found (non-critical)';
}
```

That catch fires **only if `getAcceptanceCriteria()` throws**, and it never throws for a
missing checklist:

1. A missing checklist returns `found: false` (and pre-ticket, returned `[]`) — never a throw.
2. The only throw inside the method is
   `McpError(InvalidParams, 'No board ID or card ID provided and no active board set')` from
   `resolveChecklistsInScope`, reachable only when `activeConfig.boardId` is falsy.
3. But `health-endpoints.ts:218-223` already early-returns when `trelloClient.activeBoardId`
   is falsy — and `activeBoardId` is a getter over `this.activeConfig.boardId`
   (`trello-client.ts:135-137`), *the same field*. So that throw is **unreachable** at `:262`.

**Net effect:** the catch fires exclusively on axios/transport failures — network error, 401,
429, 5xx — and silently relabels a genuine infrastructure fault as benign missing content,
while the condition its message actually names can never reach it. The sibling workspace
check 12 lines up (`:250-258`) handles its own failure correctly, so this block is
inconsistent with its immediate neighbour.

**Pre-existing, not a regression:** before MCPS-2, `getChecklistItems` also returned `[]` for
a missing checklist and threw only on no-board/API error.

**The right trigger, in two parts:**
- Not-found now has a first-class signal, `acceptance_criteria_found === false` (added by
  MCPS-2). A `checklist_note` for that condition is redundant with it; if actionability is
  wanted there, `availableChecklists` is the useful payload, not a note.
- The catch should report a transport failure (e.g. `checklist_check_error: <message>`), and
  arguably push to `results.issues` / set `results.consistent = false` — a 401 or 5xx is a
  real health signal.

**Why it was not fixed in MCPS-2:** it needs (a) the field renamed/retriggered, (b) a
behavioural decision on whether an API error flips `consistent`/`issues` — which the two
adjacent blocks currently answer *differently*, making it a semantics call rather than a typo
fix, and (c) a decision on whether a not-found note should exist at all now that
`acceptance_criteria_found` does.

Surfaced by quality reviewer #2, confirmed in detail by the implementer, who correctly
declined to fix it inside MCPS-2.

## D13 — `src/health/**` has zero test coverage (Minor)

`grep -rln "health" tests/` returns nothing, and no test asserts on any
`acceptance_criteria_*` key. MCPS-2's two new health fields are verified by `typecheck` and
inspection only — which is also why they diluted the coverage percentages slightly. Test
scaffolding for that module does not exist yet; standing it up is its own task.

## D11 — The breaking change still needs a release/version decision (operator call)

The `CHANGELOG.md` entry exists under `## [Unreleased]` and is marked BREAKING, but **no
version was bumped** — deliberately, since releasing is a separate process with its own
four-literal version-sync requirement (`package.json`, `server.json` `.version`,
`server.json .packages[0].version`, and the literal in `src/index.ts`).

`## [Unreleased]` is unusual for this file, where every other section is a released version.
That is the correct consequence of not bumping, and it leaves the release process free to
rename the section at release time. **Whoever cuts the next release must decide whether a
response-shape break on a published tool warrants a major bump** — the package is on npm
with substantial download volume, and the BREAKING marker is prose rather than a
version-forcing signal.
