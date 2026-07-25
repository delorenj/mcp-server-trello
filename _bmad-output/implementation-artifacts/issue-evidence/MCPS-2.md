# Evidence: MCPS-2 — Make get_acceptance_criteria heading-tolerant with an honest not-found response

## Issue
- Ticket: MCPS-2 (Plane `33god/MCPS`, board `19aa5f54-3c91-4e32-8c8c-9e91f625d162`)
- Milestone / horizon: no active cycle on this board; origin is product-discovery run `run-20260725-0231`, definition frozen at `_bmad-output/product-discovery/definitions/run-20260725-0231-ac-heading-tolerance.md`
- Worker: mcps2-implementer (Agent tool, general-purpose, claude-opus-5[1m])
- Additional worker: mcps2-docfixer (Agent tool, general-purpose, claude-opus-5[1m]) — final two documentation surfaces only, commit `c5b97b4`
- Orchestrated by: momo

## Acceptance Criteria
1. AC1 (FR1) — a card whose checklist is named `"AC"` returns that checklist's items with `matchedChecklistName: "AC"`, covered by an automated test.
2. AC2 (FR1) — the same holds for `"DoD"`, `"Definition of Done"`, and mixed-case variants such as `"dod"`, covered by automated tests.
3. AC3 (FR2) — a checklist with 4 items, 2 complete, returns `percentComplete: 50` and exactly the 2 incomplete items in `unmet`, covered by an automated test.
4. AC4 (FR3) — a card with checklists `["Backlog", "QA"]` and no alias match returns `found: false`, a human-readable `reason`, and `availableChecklists: ["Backlog", "QA"]` rather than a bare empty list, covered by an automated test.
5. AC5 (FR4) — a card with an alias-named checklist containing zero items returns `found: true`, `items: []`, `unmet: []`, `percentComplete: 0`, provably distinct from AC4's response, covered by an automated test.
6. AC6 (slot ledger + regression) — `grep -c "registerTool(" src/index.ts` remains 57 and `npm run typecheck` passes clean.

## Repo Changes
- Branch: `feat/mcps-2-ac-heading-tolerance` (base `41bc3481904568c806341471972c525230a40877` → head `c5b97b4ebeb4d1e1ec13b9971a17631fbcde9f4a`)
- Four commits:
  - `7fda3d9` — the feature: alias matching and the `{found}` discriminated union
  - `d33a2ac` — documentation (README, CHANGELOG, skill API reference), two rounding-mode tests, trimmed tool description
  - `9b4effa` — coverage-ratchet update (CI fix) and `acceptance_criteria_found` on both health surfaces
  - `c5b97b4` — the two remaining stale documentation surfaces
- Files changed:
  - `src/trello-client.ts` — added the exported `ACCEPTANCE_CRITERIA_ALIASES` constant (precedence-ordered), a private `resolveChecklistsInScope` helper, and rewrote `getAcceptanceCriteria` to match the alias set and return the discriminated union. `getChecklistItems` and every other checklist method left byte-identical.
  - `src/types.ts` — added `AcceptanceCriteriaFound`, `AcceptanceCriteriaNotFound`, and the `AcceptanceCriteriaResult` union, all exported and documented.
  - `src/index.ts` — tool description rewritten (708 → 251 characters) and the handler renamed its local from `items` to `result`. No schema change, no new tool, no rename.
  - `src/health/health-endpoints.ts`, `src/health/health-monitor.ts` — adapted to the new return type (a not-found result counts as zero items, matching prior behavior) and each gained an `acceptance_criteria_found` field so the found/not-found distinction survives into the health surface. `HealthStatus` semantics deliberately unchanged.
  - `tests/unit/trello-client.test.ts` — 15 new tests covering all six ACs plus alias precedence, cross-checklist aggregation ordering, both scope paths, active-board fallback, the `McpError`, and both rounding modes.
  - `README.md`, `CHANGELOG.md`, `skill/references/trello-mcp/api.md`, `skill/references/trello-mcp/patterns.md`, `examples/usage-examples.md` — updated to the new contract. The CHANGELOG gains an `## [Unreleased] → ### Changed` entry marked BREAKING with an explicit caller migration path.
  - `vitest.config.ts` — coverage ratchet raised to the branch's actual watermark. Required: the ratchet uses `autoUpdate: true`, and CI runs the coverage gate then asserts `git diff --exit-code -- vitest.config.ts`, so a stale watermark fails the build deterministically.
- Migrations / schema: none. The health fields are free-form bags, so no schema break.
- Version literals: deliberately untouched. `package.json`, `server.json`, and the version literal in `src/index.ts` are identical to base — releasing is a separate process with its own four-literal synchronization requirement.

## Verification
- Commands executed and results (all executed by momo directly against head `c5b97b4`, independently of any worker's report):
  - `npm run typecheck` → exit 0, no diagnostics
  - `npm test` → 9 files passed, 1 skipped; 156 tests passed, 26 skipped, 0 failed
  - `npx vitest run tests/unit` → 8 files, 143 tests, all passed
  - `grep -c "registerTool(" src/index.ts` → `57` (also `57` at base `41bc348`, so genuinely zero new tools)
  - `npx vitest run --coverage --coverage.thresholds.autoUpdate=false` → statements 24.4%, branches 23.67%, functions 37.82%, lines 24.92% — an exact match to the committed watermark in `vitest.config.ts`, so the CI ratchet check passes and no rewrite occurs
  - `git status --short` against `src/`, `tests/`, `vitest.config.ts`, docs → clean; no unrelated working-tree noise entered any commit
- The 26 skipped tests are `tests/smoke/smoke.test.ts`, gated by `describe.skipIf(!canRunSmoke)` on Trello credentials. The count is identical at base and head, so nothing was silenced by this change.
- AC → evidence mapping (test names in `tests/unit/trello-client.test.ts`):
  - AC1 → `should match a checklist named "AC" and report its board spelling` (:478). Asserts the whole result object; a revert-to-exact-match mutant kills it.
  - AC2 → `should match "DoD"` (:501), `should match "Definition of Done"` (:510), `should match mixed-case and padded alias spellings without canonicalizing the name` (:523). The last asserts `matchedChecklistName: '  dod  '` verbatim, which simultaneously proves trimming happens on the comparison side and does not happen on the returned name; both a trim-removal mutant and a canonical-name mutant kill it.
  - AC3 → `should compute percentComplete and unmet for 4 items with 2 complete` (:536). Asserts `unmet` identity and order, not merely a count; an inverted-predicate mutant kills it.
  - AC4 → `should return an explicit not-found with the checklists that do exist` (:556). Asserts the exact `availableChecklists`, all four alias names inside `reason`, and `expect(result).not.toHaveProperty('items')`.
  - AC5 → `should distinguish a matched-but-empty checklist from not-found` (:584). Compares against a live not-found result computed in the same test; a mutant removing the divide-by-zero guard kills it.
  - AC6 → `grep -c "registerTool(" src/index.ts` → 57, and `npm run typecheck` → exit 0.
  - Supplementary → alias precedence (:604, fixture deliberately ordered `DoD`/`AC`/`Acceptance Criteria` so a naive array-order implementation fails), cross-checklist aggregation with ordering asserted via `parentCheckListId` (:618), board-scoped path (:634), active-board fallback (:656), `McpError` when no scope resolves (:668), and the two rounding-mode tests pinning `Math.round` against `floor` (2 of 3 → 67) and `ceil` (1 of 3 → 33).
- Independent review: five reviewer instances across four gates, all structurally separate spawns from the implementer. Reports preserved in `../issue-reviews/`. Gate 1 proved test non-vacuity by mutation testing (14 mutants built, 12 killed). A second quality reviewer found a CI-breaking coverage-ratchet defect that three other reviewers and momo had all missed; it was verified independently and fixed in `9b4effa`.

## Ledger Update
- Bloodbank decision events emitted: 8 (see `../bloodbank-events.jsonl`) — covering the pull into active work, the multi-match tie-break specification, the sentinel-scaffold install, the concurrent-gates choice, the first fix round, and the critical-finding hold.
- Deferred findings recorded with full reasoning in `../MCPS-2-deferred-findings.md` (13 items, D1–D13).
- Ledger updated: yes

## Known Gaps
- The live stdio smoke described as optional in the frozen definition was deliberately skipped. It requires Trello credentials plus a purpose-built card whose acceptance-criteria checklist is named `"DoD"`, and creating one writes to the operator's real board. Deferred to the operator's QA sweep rather than performed autonomously.
- `src/health/**` has no test coverage anywhere in the repo, so the two new `acceptance_criteria_found` fields are verified by typecheck and inspection rather than by an automated test. Recorded as D13.
- A pre-existing defect was discovered and deliberately left in place: `health-endpoints.ts:269-270` sets `checklist_note` from a `catch` that can fire only on transport failures, so a genuine API fault is relabeled as benign missing content. Fixing it requires a semantics decision that two adjacent blocks currently answer differently. Recorded as D12 with the full reachability argument.
- The change is a breaking response-shape change carrying a CHANGELOG entry marked BREAKING under `## [Unreleased]`, with no version bump by design. Whether it releases as a major version is an operator decision. Recorded as D11.
- Twelve further deferred items (D1–D10) are documented with reasoning; none blocks this ticket's acceptance criteria.

## Close Recommendation
- Close recommendation: ready
- Rationale: all six acceptance criteria are satisfied by automated tests that were proven non-vacuous by mutation testing, scope drift is none with the tool count unchanged at 57, every finding raised across four review gates is either closed in-branch or explicitly deferred with recorded reasoning, and the previously CI-breaking coverage ratchet is verified green by simulating the exact CI sequence.
