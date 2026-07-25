# MCPS-2 — Independent Code-Quality Review (reviewer 2)

**Assigned scope:** `git diff 41bc3481904568c806341471972c525230a40877..7fda3d9`, branch `feat/mcps-2-ac-heading-tolerance`
**Lane:** code quality only. Spec/AC compliance is a separate reviewer's call and is deliberately not assessed here.
**No repo file was modified.** This report is the only write.

> ### ⚠️ The branch moved during this review — read this first
>
> When I started, `7fda3d9` was branch HEAD. It no longer is. A follow-up commit **`d33a2ac` `docs(acceptance-criteria): document alias tolerance and pin rounding mode`** landed mid-review, touching `CHANGELOG.md`, `README.md`, `docs/.../api.md`, `src/index.ts` (the tool description), and `tests/unit/trello-client.test.ts` (+30 lines).
>
> I judged the assigned range, then re-verified every finding against `d33a2ac`. Findings already fixed there are marked **[FIXED AT HEAD]** and are informational only. Everything else is still open at `d33a2ac`.
>
> `src/trello-client.ts`, `src/types.ts`, and both `src/health/` files are byte-identical between `7fda3d9` and `d33a2ac`, so all line numbers for those files are valid at both. Test-file line numbers below are **as of `d33a2ac`** (they shifted +30 after line 552).

**Verification performed (all read-only):**

| Check | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | clean, at both revisions |
| `npx vitest run` | `7fda3d9`: 154 passed / 26 skipped · `d33a2ac`: 156 passed / 26 skipped |
| `npx vitest run --coverage --coverage.thresholds.autoUpdate=false` | statements 24.42 · branches 23.67 · functions 37.82 · lines 24.94 — **identical at both revisions** |
| Read all 5 sibling checklist methods in `src/trello-client.ts` | for the duplication question |
| Measured all 57 `description:` literals in `src/index.ts` | for the bloat question |
| `git show 41bc348:vitest.config.ts` | to establish the coverage watermark's provenance |

The `--coverage.thresholds.autoUpdate=false` flag was used specifically so the measurement could not rewrite `vitest.config.ts`. `git status --porcelain vitest.config.ts` confirmed clean afterward.

---

## 1. Strengths

- **The union is the right shape, and it costs the callers nothing.** `src/types.ts:291-320` splits `AcceptanceCriteriaFound` / `AcceptanceCriteriaNotFound` into two named, individually-exported interfaces with literal `found: true|false` discriminants, then unions them. Better than one optional-riddled interface: `items` / `unmet` / `percentComplete` are non-optional on the found arm, so the found path never needs `?.` or `!`. Every narrowing site in the diff — `src/health/health-monitor.ts:383`, `src/health/health-endpoints.ts:264`, and six sites in tests — narrows on a plain `.found` check with **zero `as` casts anywhere**. That is the working definition of a well-formed discriminated union, and it is the single best thing in this diff.

- **Precedence is data, not control flow.** `ACCEPTANCE_CRITERIA_ALIASES` (`src/trello-client.ts:32-42`) makes alias order a readable `as const` literal, and the `for…of` + `continue` loop reads as "first alias with any match wins" with no nesting. Adding an alias is a one-line data change with no logic edit.

- **The not-found `reason` is generated from the same constant it describes** (`src/trello-client.ts:858`). The alias list in the user-facing message can never drift from the alias list used for matching — a whole class of doc-rot eliminated structurally rather than by discipline. Worth naming because the tool description in `index.ts` did *not* get this treatment (M4).

- **New code is measurably more defensive than the four methods it sits beside.** `resolveChecklistsInScope:816` adds `response.data || []` where `getChecklistItems:687` has a bare `response.data`; `:844` has `(checklist.checkItems || [])` where `:694` has bare `checklist.checkItems`; `:839` has `checklist.name || ''` where `:693` has bare `checklist.name.toLowerCase()`. Three separate `TypeError`-on-malformed-payload paths that the surrounding code still has.

- **`matchedChecklistName` preserves the board's own casing** (`matching[0].name`, not the canonical alias), and that choice is explicitly tested. An agent echoing that string to a human hands back the string the human will actually see on their board. Small decision, easy to get wrong, got it right.

- **`convertToCheckListItem` was reused, not reimplemented** (`:844`), so `CheckListItem` construction stays owned by one function.

- **Tests assert the API contract, not just the return value.** `expect(mockAxiosInstance.get).toHaveBeenCalledWith('/cards/c1', { params: { checklists: 'all' } })` and the `/boards/board123/checklists` equivalent pin the outbound shape — the assertion most people skip. `expect(mockAxiosInstance.get).not.toHaveBeenCalled()` on the no-board throw path proves the validation is a *pre*-flight check, not a post-hoc one. And `expect(result).not.toHaveProperty('items')` asserts the union's *shape*, not merely its field values.

---

## 2. Issues

### Critical

**C1 — `vitest.config.ts` coverage ratchet is not updated; CI fails deterministically on this branch.**
`vitest.config.ts:22-28` · `.github/workflows/ci.yml`

Not a style point — measured. The committed watermark is `lines: 23.45, statements: 22.75, functions: 35.31, branches: 22` with `autoUpdate: true`. Actual coverage on this branch is **lines 24.94 · statements 24.42 · functions 37.82 · branches 23.67** — all four exceed it. CI runs `bun run test:coverage` (which lets vitest rewrite `vitest.config.ts` in place), then immediately runs `git diff --exit-code -- vitest.config.ts`. The rewrite is guaranteed, so that step fails. `vitest.config.ts` is untouched by `7fda3d9` **and** by `d33a2ac`.

Provenance check: base `41bc348` is the commit that introduced those exact numbers, so they were the watermark at base and would not have rewritten there. The drift is introduced by this branch's new tests. Coverage is identical at `7fda3d9` and `d33a2ac`, so `d33a2ac` does not fix it.

**Fix:** run `bun run test:coverage` locally and commit the rewritten `vitest.config.ts`. The ratchet only ever moves up — this is exactly the workflow the comment at `vitest.config.ts:18-21` describes, the PR just didn't run it.

### Important

**I1 — Breaking output-shape change had no CHANGELOG entry.** — **[FIXED AT HEAD by `d33a2ac`]**
`CHANGELOG.md`

At `7fda3d9`: `get_acceptance_criteria`'s MCP output went from a bare `CheckListItem[]` to `{found, …}`, and every consumer doing `result[0]` / `.length` / `.map()` breaks *silently* — reading `undefined`, not throwing. The repo keeps a strict Keep-a-Changelog file that explicitly claims semver adherence, and `1.7.0`'s entry documents this very tool's signature; the diff touched neither `CHANGELOG.md` nor `package.json`.

`d33a2ac` adds an `## [Unreleased] → ### Changed` block that leads with **BREAKING**, names both the old and new shapes, and spells out the caller migration (`.length`/`.map()` → check `.found`, read `.items`). That's the correct Keep-a-Changelog answer, and deferring the actual version number to release time is right given the repo's `versionbump` tooling. **Closed — no action.** One residual judgment call for the team, not a defect: `[Unreleased]` will need to release as **2.0.0**, not 1.9.0, if the semver claim in the CHANGELOG header is to hold.

**I2 — `resolveChecklistsInScope` is a fifth copy of a block that already existed four times.**
`src/trello-client.ts:794-817`

The card-vs-board resolution block now appears at `:671-688` (`getChecklistItems`), `:712-729` (`addChecklistItem`), `:757-774` (`findChecklistItemsByDescription`), `:880-897` (`getChecklistByName`), and `:798-816` (the new helper). Same two URLs, same `activeConfig.boardId` fallback, and the string `'No board ID or card ID provided and no active board set'` written out as a literal **five times** — a string that tests already assert on, where a typo in any one copy is invisible until runtime.

I am not asking for the refactor in this PR; see Q1 for why, and for the exact behavior-preserving consolidation.

**Fix (separate PR):** point the four existing sites at `resolveChecklistsInScope`. Full delta analysis in Q1.

**I3 — The health callers collapse `found: false` to zero and discard the only new signal they gained.**
`src/health/health-endpoints.ts:264-266` · `src/health/health-monitor.ts:383-395`

The collapse is correct and consistently applied (Q2). The problem is the output: `acceptance_criteria_items: 0` and `"Checklist operations functioning (0 acceptance criteria found)"` are now *knowingly* ambiguous strings emitted by a **self-diagnostic surface** — the one place an operator goes specifically to find out what's wrong. "This board has no AC checklist" and "this board's AC checklist is named `Sign-off`" produce byte-identical health output, and separating exactly those two is the entire premise of MCPS-2.

The irony is sharp: `health-endpoints.ts:269-270` already holds a `checklist_note` reading *"Acceptance Criteria checklist not found (non-critical)"* — but it lives in the `catch`, so it only ever fires for an API or board-config error. The one string in the file that describes this condition has always been wired to a different condition. The new union finally makes it truthfully reachable and the diff doesn't reach for it.

Not a regression (the old code returned `[]` for both cases too), which is why this is Important and not Critical.

**Fix — two lines, no change to `HealthStatus`, no change to any count:**
```ts
// health-endpoints.ts, after :266
if (!acceptanceCriteria.found) {
  results.statistics.checklist_note =
    'No checklist matched a recognized acceptance-criteria name (non-critical)';
}
```
```ts
// health-monitor.ts, inside the metadata object
acceptance_criteria_found: criteria.found,
matched_checklist_name: criteria.found ? criteria.matchedChecklistName : null,
```

### Minor

**M1 — `availableChecklists` omits the `|| ''` guard the matching path applies twenty lines above.**
`src/trello-client.ts:865` vs `:839`

`TrelloChecklist.name` is `string` (`src/types.ts:128`) and Trello always populates it on both endpoints, so this cannot fire. Full answer in Q3 — the defect is the *inconsistency*, not the missing guard.

**Fix:** pick one belief and apply it twice. `availableChecklists: checklists.map(c => c.name ?? '')`, **or** drop the `|| ''` at `:839` to match repo convention (`:693`, `:732`, `:900` are all unguarded). Either is fine; the split is not.

**M2 — `matchedChecklistName` is singular, but the result may aggregate several checklists.**
`src/trello-client.ts:843-853`

When a card carries both `ac` and `AC`, items from both are merged and the result is labelled `'ac'` — an agent reporting "3 criteria in checklist `ac`" would be wrong about two of them. `parentCheckListId` per item does disambiguate, so no information is lost, only mislabelled. The JSDoc at `:824-828` documents this precisely; **neither** the original nor the `d33a2ac`-shortened tool description mentions it — both say the first match "wins", which reads as *one checklist*. The shortened version is if anything slightly worse here, having dropped length without adding this.

**Fix:** cheapest is one clause in the tool description: *"same-named checklists merge; `matchedChecklistName` reports the first."* A `matchedChecklistNames: string[]` field would be more honest but is a second breaking shape change — not worth it now.

**M3 — `percentComplete` re-derives a formula `convertToCheckList` already owns.**
`src/trello-client.ts:851` vs `:1126-1131`

`Math.round((complete / total) * 100)` with a zero-guard now exists twice, correctly identical. Same rounding quirk in both: 199-of-200 renders `percentComplete: 100` beside a non-empty `unmet`, which reads as self-contradictory. Keeping it identical to `convertToCheckList` is the right call — any fix must change both.

**Fix (optional):** `private percentComplete(items: { complete: boolean }[]): number`, called from both sites.

**M4 — The tool description hard-codes the alias list that `ACCEPTANCE_CRITERIA_ALIASES` already owns.**
`src/index.ts:1180`

`getAcceptanceCriteria`'s `reason` derives its alias list from the constant (`trello-client.ts:858`); the tool description spells the four names out by hand. Add a fifth alias and one of the two goes stale — and it'll be the one every agent reads. **`d33a2ac` shortened the description but did not fix this**; the hand-written list survived the rewrite.

**Fix:** interpolate. The constant is already exported:
```ts
`… Matches a checklist named ${ACCEPTANCE_CRITERIA_ALIASES.map(a => `"${a}"`).join(', ')} (case-insensitive) …`
```

**M5 — Six hand-rolled `throw new Error('expected found')` narrowing guards.**
`tests/unit/trello-client.test.ts:549, 595, 644, 657, 682, 694`

They compile and they narrow, but on failure they surface as a bare thrown `Error` — no diff, no expected/actual, no vitest formatting. Strictly worse output in exactly the moment you need output.

**Fix:** one helper at the top of the describe block, giving both narrowing *and* a real assertion:
```ts
function assertFound(r: AcceptanceCriteriaResult): asserts r is AcceptanceCriteriaFound {
  expect(r.found).toBe(true);
}
```

**M6 — One test bundles two independent scenarios and re-mocks mid-test.**
`tests/unit/trello-client.test.ts:523-533`

`'should match mixed-case and padded alias spellings…'` asserts `'  dod  '`, then re-mocks and asserts `'acceptance CRITERIA'`. If the first fails the second never runs, and the test name doesn't say which spelling broke. Contrast the matched-but-empty-vs-not-found test (`:535`), which also uses two mocks — but there the *comparison between the two results* is the assertion, so bundling is correct and should stay. The distinction is worth preserving.

**Fix:** `it.each([['  dod  '], ['acceptance CRITERIA'], ['  Definition Of DONE ']])`.

**M7 — The `checklist()` test factory is structurally typed, not `TrelloChecklist`-typed.**
`tests/unit/trello-client.test.ts:452`

Returns an inferred object literal; the mock helpers key off `ReturnType<typeof checklist>`. If `TrelloChecklist` gains a required field, production compiles and these fixtures silently keep minting payloads the client can no longer receive. One-token fix, real refactor-survivability gain.

**Fix:** `function checklist(...): TrelloChecklist`.

**M8 — Guarded branches with no test.** `src/trello-client.ts:816, 839, 844`

Every `|| []` / `|| ''` fallback in the new code is unexercised: `checkItems` absent on a matching checklist, board endpoint returning no body, checklist with a nullish name. These are precisely the branches a future "cleanup" refactor deletes, because nothing fails when they go. **Partially addressed at HEAD** — `d33a2ac` added the two rounding tests (1/3 → 33, 2/3 → 67) that pin `Math.round` against floor and ceil implementations, which was the other half of this finding and is a genuinely good pair of tests. The three `||` guards remain uncovered.

**Fix:** three one-line tests.

**M9 — Added lines exceed the repo's Prettier `printWidth: 100`.**
`tests/unit/trello-client.test.ts:506` (114 chars), and at HEAD also `:556`, `:571` (115/117, from `d33a2ac`)

`.prettierrc` sets `printWidth: 100`. Prettier is **not** enforced in `.github/workflows/ci.yml`, so this is cosmetic only. The other over-length lines are `it(...)` titles and the description string, which Prettier won't reflow anyway.

**Fix:** `npx prettier --write tests/unit/trello-client.test.ts`.

---

## 3. The four questions

### Q1 — Is duplicating the card-vs-board block in `resolveChecklistsInScope` the right trade?

**Yes for this PR — and the framing undersells what happened. This is the *least* duplicated this code has ever been.**

"The new helper duplicates the block `getChecklistItems` still has inline" describes a 1-vs-1 situation. The reality is 4-vs-5: that block existed at `:671`, `:712`, `:757`, and `:880` **before this diff touched anything**. Copy #5 didn't create the problem, and refusing to write it wouldn't have solved it — the alternative was a sixth ad-hoc inline variant inside `getAcceptanceCriteria`, which is exactly what every sibling method does. Instead the author wrote the first *named, documented, single-responsibility* version of that block in the file, in early-return form, with guards the originals lack. The count went up; the shape of the debt improved. Those are both true and the second one matters more.

And given the hard "no behavior change to `getChecklistItems`" requirement, extract-and-rewire was the wrong move for this PR independent of its merits: it turns a scoped feature diff into a four-method refactor with its own test surface, and buries the actual change under it. Duplicate-now, consolidate-next is correct sequencing, not a compromise.

**If you want it factored, here is exactly how — and it belongs in its own PR.**

`resolveChecklistsInScope` is behavior-identical to `getChecklistItems:671-688` on every input except two, both unreachable from a well-formed Trello response:

| Input | `getChecklistItems` today | Via `resolveChecklistsInScope` |
|---|---|---|
| board endpoint returns no body | `checklists = undefined` → `for…of` throws `TypeError` | `[]` → returns `[]` |
| a matching checklist has no `checkItems` | `.map` on `undefined` → `TypeError` | treated as empty |

I checked `tests/` — nothing asserts a thrown `TypeError` from any of these methods, so no test pins the current crash behavior. The mechanical change is:

```ts
async getChecklistItems(name: string, cardId?: string, boardId?: string): Promise<CheckListItem[]> {
  const checklists = await this.resolveChecklistsInScope(cardId, boardId);
  return checklists
    .filter(cl => cl.name.toLowerCase() === name.toLowerCase())
    .flatMap(cl => cl.checkItems.map(item => this.convertToCheckListItem(item, cl.id)));
}
```

Note what is deliberately **not** carried over: no `.trim()`, no `|| ''` on `name`, no `|| []` on `checkItems`. The generic path keeps its exact matching semantics *and* its exact crash-on-malformed behavior. Only the **fetching** is shared. That line is what makes this safe.

If even those two malformed-payload deltas are unacceptable, the honest fallback is to convert the three sites where it's provably identical and leave `getChecklistItems` as a documented holdout — 5 copies down to 3, with a comment saying why the fifth stayed.

**One way this goes actively wrong:** a future PR pulling the alias/trim/normalize logic *into* `resolveChecklistsInScope` to "share more." Don't. `resolveChecklistsInScope` is a fetch helper; AC-specific normalization living in `getAcceptanceCriteria` and nowhere else is the load-bearing part of the current design, and it is the only thing keeping the generic path's semantics safe.

### Q2 — Are the `src/health/` updates consistent, and do they mask something the health check should surface?

**Consistent: yes, cleanly. Masking: yes — and it matters more here than anywhere else in the diff.**

**On consistency.** Both files apply the identical rule (`found ? items : []`), both carry the same one-line comment stating the intent, and `health-monitor.ts:395` correctly derives `completed_items` from the collapsed array rather than reaching back into the union. The only asymmetry is mechanical and appropriate: `health-endpoints.ts:264` inlines `.items.length` because it needs the count once; `health-monitor.ts:383` materializes `criteriaItems` because it needs the array three times. And no caller was missed — `src/index.ts:1194`, `src/health/health-endpoints.ts:262`, `src/health/health-monitor.ts:381` is the complete grep, and all three are updated.

**On masking — yes, and this is my one substantive disagreement with the implementation.** The argument is strongest precisely because of *where* it lands. A health endpoint is a diagnostic surface; its only job is to tell an operator what is wrong. It now emits `acceptance_criteria_items: 0` and `"Checklist operations functioning (0 acceptance criteria found)"` for two conditions the client can, for the first time in its life, tell apart:

1. There is genuinely no AC checklist → nothing to report, `0` is honest.
2. There *is* one, named `Sign-off` / `Exit Criteria` / anything unrecognized → `0` is actively misleading, and it is the exact failure mode MCPS-2 exists to eliminate.

The diff spent real effort giving the client the ability to distinguish these, then had its own health checks throw that ability away one line after receiving it. And `health-endpoints.ts:269-270` already contains a `checklist_note` field whose text literally names condition 2 — sitting in a `catch` block where it can only fire for API/board-config errors.

**But it is not a regression and not a merge blocker.** The pre-change code returned `[]` for both cases too; today's health output is exactly as ambiguous as yesterday's. The collapse is a faithful compatibility shim and the comments are honest about being one. It's the two-line I3 fix that should land — ideally in this PR, since the patch is shorter than this paragraph.

### Q3 — Is the missing `|| ''` on `availableChecklists` a real defect?

**Theoretical as a crash. Real as a smell. Minor — fix it because it's free, don't gate merge on it.**

`TrelloChecklist.name` is `string` (`types.ts:128`), and both `/boards/{id}/checklists` and `/cards/{id}?checklists=all` always populate it. There is no input to this function that makes `:865` yield `null`. As a defect hunt, dead end.

What's actually wrong is that `:839` and `:865` sit in the same function, twenty lines apart, encoding **opposite beliefs about the same field**. One says "`name` may be nullish, defend." The other says "`name` is a string, trust the type." A later reader cannot tell which is the considered position, and experience says they'll cargo-cult whichever they hit first. And in the branch where the pessimistic reading would be right, `availableChecklists` holds `null` while declared `string[]` — a lying type, in the exact field whose entire purpose is telling a confused agent what really exists.

Calibration point that cuts against the guard rather than for it: the surrounding code (`getChecklistItems:693`, `addChecklistItem:732`, `getChecklistByName:900`) all do bare `checklist.name.toLowerCase()`. Repo convention is *no* guard, which makes `:839` the outlier and slightly favors deleting the `|| ''` over adding a second one. I'd accept either. I would not accept leaving them split.

### Q4 — Is the ~100-word tool description bloat or justified?

**At `7fda3d9`: bloat — cut it roughly in half. Justified in kind, not in degree. `d33a2ac` cut it, correctly, to almost exactly what I'd have asked for.**

Measured, since this is a measurable question. The `7fda3d9` description is **708 characters / 102 words**. The next-longest of the 57 descriptions in `src/index.ts` is `update_list_position` at 279 chars; the median is under 100. That's **2.5× the previous longest and ~8× typical**, in a file where all 57 load into every agent's context every session.

The justified part is real. Two facts genuinely change how an agent *calls* the tool and cannot be recovered from the response:
- **the alias list** — an agent that knows `AC`/`DoD` are recognized stops writing `get_checklist_items("AC")` fallback chains. That *is* the feature; it must be in the description.
- **`found: false` is a normal result, not an error** — without this, an agent may retry or escalate on a perfectly good answer.

The bloat was the field-by-field return-shape narration. `{ found: true, items, unmet, percentComplete, matchedChecklistName }` is self-describing JSON with named keys and a literal boolean discriminant — the agent sees it *in the response*, pays for it once when it matters, and does not need it preloaded every session. Three clauses were pure cost: "where matchedChecklistName is the checklist name as written on the board", "and unmet is the incomplete subset", and "A matched-but-empty checklist returns found: true with items: []". Field semantics that obvious belong in `types.ts` — where they already sit, verbatim, at `:291-320`. The em-dash editorial ("so 'no acceptance criteria' is never confused with…") explains *design rationale* to a consumer who needs only the *contract*; that belongs in the CHANGELOG, which is now exactly where `d33a2ac` put it.

**`d33a2ac` cut it to 253 characters** — in line with `update_list_position`, keeps the alias list and the `{found}` union, points at `reason`. That's the right call and closes the length half of this question. Two things it did **not** fix, both still open: it kept the hand-written alias list instead of interpolating the exported constant (**M4**), and it still doesn't mention that same-named checklists merge (**M2**). Folding both in costs about 40 characters:

```ts
description:
  "Get a card's (or board's) acceptance criteria. Matches a checklist named " +
  ACCEPTANCE_CRITERIA_ALIASES.map(a => `"${a}"`).join(', ') +
  ' (case-insensitive, trimmed); earliest listed name wins and same-named checklists merge. ' +
  'Returns a {found: true|false} union; read reason when not found.',
```

---

## 4. Assessment

**Mergeable with one required fix; one strongly-recommended two-line addition; the rest as follow-ups.** The core design is the strongest part of the work: the discriminated union is well-formed and forces zero unsafe narrowing at any of the eight sites that consume it, alias precedence is expressed as data rather than branching, the not-found `reason` is generated from the constant it documents so it structurally cannot rot, and the new code is more defensive than all four sibling methods it sits beside. Typecheck is clean and the suite is green at both revisions. The one blocker is not in the feature at all — **C1**, a missing `vitest.config.ts` ratchet update that fails CI deterministically at the `git diff --exit-code` step, fixed by running `bun run test:coverage` and committing the result; I measured all four metrics above the committed watermark at both `7fda3d9` and `d33a2ac`, so the follow-up commit does not resolve it. **I3** is the one I'd push to land here rather than defer: the health surface now knowingly reports an ambiguous `0` for precisely the condition this ticket exists to disambiguate, while already carrying a `checklist_note` field wired to the wrong trigger — two lines, no status-semantics change. **I1** (CHANGELOG) and the tool-description bloat (**Q4**) were both real at the reviewed revision and are both fixed by `d33a2ac`, which also added two genuinely good rounding tests that kill floor and ceil implementations; the residual is that `[Unreleased]` needs to release as 2.0.0 for the CHANGELOG's semver claim to hold. The duplication (**I2**) is correctly deferred — it is copy #5 of a block that already existed four times, written for the first time as a named helper, and Q1 gives the exact behavior-preserving consolidation for a separate PR along with the one refactor direction that would make things worse. Everything remaining is Minor: reconcile the split `|| ''` belief, interpolate the alias constant into the description and mention merging, swap the six hand-rolled narrowing throws for an `asserts` helper, split the two-scenario test, type the fixture factory as `TrelloChecklist`, and cover the three `||` guards.

---

## 5. Reviewer identity

`mcps2-quality-reviewer-2 (Agent tool, general-purpose + code-reviewer skill, claude-opus-5[1m])`
