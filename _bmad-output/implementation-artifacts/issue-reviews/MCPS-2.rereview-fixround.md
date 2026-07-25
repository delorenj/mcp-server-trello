# MCPS-2 Fix-Round Re-Review

**Branch:** `feat/mcps-2-ac-heading-tolerance`
**Fix round:** `7fda3d9 → d33a2ac`
**Whole change:** `41bc348 → d33a2ac`
**Reviewed:** 2026-07-25

---

## 1. VERDICT

# ✅ fixes confirmed

All three findings are genuinely closed. All five regression checks PASS. No new
issues at medium or higher. Two low-severity residual doc surfaces the fix round
did not reach (§4) — neither is a blocker and neither was in the stated scope.

---

## 2. Fix-by-fix

### FIX 1 — doc drift → **CLOSED**

Three surfaces, all now accurate.

**`README.md:270` — CLOSED, and it covers all four things asked.**

Old line (base `41bc348`): `Get all items from the "Acceptance Criteria" checklist.`
New (`README.md:270`):

> Get a card's (or board's) acceptance criteria, tolerating the common checklist headings teams actually use. A checklist matches if its name equals `Acceptance Criteria`, `AC`, `DoD`, or `Definition of Done` — compared case-insensitively and whitespace-trimmed. The first alias in that order with any match wins.

Verified against the implementation line-by-line:

| README claim | Impl evidence | ✓ |
|---|---|---|
| alias set + order | `src/trello-client.ts:36-41` `ACCEPTANCE_CRITERIA_ALIASES = ['Acceptance Criteria','AC','DoD','Definition of Done']` | ✓ |
| case-insensitive + trimmed | `:835` `const normalize = (name) => name.trim().toLowerCase()` | ✓ |
| "first alias **in that order with any match** wins" | `:837-841` `for (const alias of …) { const matching = …; if (matching.length === 0) continue; }` — precise: it's alias precedence, not checklist order | ✓ |

**Both halves of the union — present.** `README.md:280-289` documents the
`found: true` branch (`items`, `unmet`, `percentComplete`, `matchedChecklistName`);
`README.md:291-299` documents the `found: false` branch (`reason`,
`availableChecklists`). Field-by-field against `src/trello-client.ts:846-866`: exact
match, no invented and no omitted field. The inline comments are also correct —
`percentComplete` "0 when there are no items" matches `:851`
`items.length === 0 ? 0 : …`; `matchedChecklistName` "as written on the board,
original casing" matches `:853` `matchedChecklistName: matching[0].name`.

**Matched-but-empty case — present**, `README.md:301`:

> A checklist that matches but has no items returns `found: true` with `items: []`, which is distinct from the not-found response above.

**Previously-undocumented `cardId` param — present**, `README.md:276`:

> `cardId?: string,  // Optional: ID of the card to scope the search to (recommended to avoid ambiguity)`

Matches the zod `.describe()` at `src/index.ts:1184` and the scope-resolution
behavior at `src/trello-client.ts:794-817` (cardId → `GET /cards/{id}?checklists=all`;
else board).

**`CHANGELOG.md:8-12` — CLOSED, and it is under `## [Unreleased]`, marked BREAKING,
and actionable.**

- Heading is literally `## [Unreleased]` (`CHANGELOG.md:8`).
- Marked BREAKING: `- **BREAKING — \`get_acceptance_criteria\` response shape**: …`
- Migration path is explicit and actionable: *"Callers that treated the result as
  an array (`.length`, `.map()`, iteration) must migrate to reading `.items` after
  checking `.found`."* That is the exact old → new shape (`CheckListItem[]` →
  `{found}` union), names the specific call patterns that break, and states the fix.
- Second bullet documents the alias tolerance with the precedence rule, the
  aggregation semantics, and the "no fuzzy matching" scope boundary.

**`skill/references/trello-mcp/api.md:39` — CLOSED.** Old: ``Get the `Acceptance
Criteria` checklist.`` New line carries the alias set, the precedence rule, and
both halves of the union. **It matches the README and the tool description** — same
four aliases, same order, same field names. No contradiction anywhere.

*Nit (not a defect):* `api.md:39` says "(case-insensitive, …)" and omits
"whitespace-trimmed", which the README and CHANGELOG both carry. An omission, not a
falsehood, in the most space-constrained of the three surfaces.

---

### FIX 2 — pin the rounding mode → **CLOSED**

The mutation target is `src/trello-client.ts:851`:

```ts
percentComplete: items.length === 0 ? 0 : Math.round((completeCount / items.length) * 100),
```

**Why the old fixtures let both mutants live** — verified: every prior
`percentComplete` assertion is `0` or `50` (`tests/unit/trello-client.test.ts:490,
548, 622, 661, 680`). Computed: `0/3 → {round:0, floor:0, ceil:0}` and
`1/2 → {round:50, floor:50, ceil:50}`. Identical under all three modes. The finding
was correct.

**The two new tests. Arithmetic computed in node, not assumed:**

```
2/3 → raw 66.66666666666666  round 67  floor 66  ceil 67
1/3 → raw 33.33333333333333  round 33  floor 33  ceil 34
```

| New test | Fixture | Asserts | vs `Math.floor` | vs `Math.ceil` |
|---|---|---|---|---|
| `…exceeds .5 (kills a floor implementation)` (`:556-568`) | 2 of 3 complete | `percentComplete: 67` | gets **66** → **FAILS ✓ kills floor** | gets 67 → passes |
| `…below .5 (kills a ceil implementation)` (`:571-583`) | 1 of 3 complete | `percentComplete: 33` | gets 33 → passes | gets **34** → **FAILS ✓ kills ceil** |

**Each test fails under exactly the mutant it names, and the pair covers both.**
The commit message's claim ("each kills exactly one new test") is accurate.

Fixture wiring verified — the helper at `tests/unit/trello-client.test.ts:452-465`
maps `['one', true]` → `state: 'complete'`, and `convertToCheckListItem`
(`src/trello-client.ts:1121`) maps `state === 'complete'` → `complete: true`, which
is what `completeCount = items.filter(item => item.complete).length` (`:845`) counts.
So 2-of-3 really is `completeCount=2, items.length=3`. Both tests use the card-scoped
mock and call `getAcceptanceCriteria('c1')` — they hit line 851, not the unrelated
`convertToCheckList` rounding at `:1131`.

**Assertion strength:** `toMatchObject` compares primitives strictly, so `66 !== 67`
and `34 !== 33` both fail hard. No leniency escape hatch.

**No source was edited to verify this** — the arithmetic was computed standalone.

---

### FIX 3 — trim the tool description → **CLOSED**

`src/index.ts:1180`. **708 → 249 chars** (measured, not taken on faith — the string
unescapes to 249). Full surviving text:

> `Get a card's (or board's) acceptance criteria. Matches a checklist named "Acceptance Criteria", "AC", "DoD", or "Definition of Done" (case-insensitive); first match in that order wins. Returns a {found: true|false} union; read reason when not found.`

**Is it accurate?** Every clause checked against the impl:

- alias set + order → `src/trello-client.ts:36-41` ✓
- case-insensitive → `:835` `.trim().toLowerCase()` ✓ (trimming dropped — omission, not falsehood)
- "first match in that order wins" → `:837-841` ✓
- "Returns a `{found: true|false}` union" → `:846` / `:859` ✓
- "read reason when not found" → `:861` `reason` is only on the `found: false` branch ✓

**Nothing false. No invented behavior.**

**Are the two non-recoverable facts retained?** Yes — both.

1. **The alias set** — an agent cannot derive `AC` / `DoD` / `Definition of Done`
   from any response payload. **Kept verbatim.**
2. **The precedence rule** — an agent cannot infer that `Acceptance Criteria` beats
   `AC` from a single response. **Kept** ("first match in that order wins").

**Is anything load-bearing lost?** No. Each dropped fact is recoverable from the
payload the agent will actually hold:

| Dropped | Recoverable how |
|---|---|
| `matchedChecklistName is the board's spelling` | the field is in the response |
| `unmet is the incomplete subset` | field present; each item carries `complete` |
| `availableChecklists lists what does exist` | field present on the not-found branch |
| matched-but-empty → `found: true, items: []` | directly observable in the payload |
| whitespace-trimmed | behavioral detail; changes no agent decision |

**Contradiction check against README and `api.md`:** none. All three name the same
four aliases in the same order, the same case-insensitivity, and the same union.

Scoping guidance (cardId vs boardId) is not lost — it lives in the zod
`.describe()` calls at `src/index.ts:1183-1189`, which ship to the client alongside
the description.

*Nit:* "first match in that order wins" is marginally looser than the README's
"first **alias** in that order with any match wins" — a reader could take it as
"only the first matching checklist is used" rather than "all checklists matching
the winning alias are aggregated." The aggregation is self-evident from the returned
`items`, so this is not load-bearing. Not worth a character in a 249-char budget.

---

## 3. Regression checks

### ✅ 1. Tool count = 57 — **PASS**

```
$ grep -c "registerTool(" src/index.ts
57
```

### ✅ 2. typecheck clean, 143 unit tests green — **PASS**

`tsc --noEmit` exits 0 with zero diagnostics. `vitest run tests/unit`: **8 files, 143
passed, 0 failed** — exactly the expected count. Literal output in §5.

### ✅ 3. No version bump — **PASS** (and it holds under all five literals)

```
$ git diff 41bc348 d33a2ac -- package.json server.json package-lock.json
(empty)
```

Zero bytes changed in `package.json` and `server.json` across the **entire** branch,
not just the fix round. The `src/index.ts` McpServer version literal is likewise
untouched — the full base→head `src/index.ts` diff is 3 hunks totalling 7 lines, all
inside the `get_acceptance_criteria` block (the description string, and
`items` → `result` renaming in the handler). No `version` token appears in it.

Independently confirmed by running the repo's own release gate, read-only:

```
$ bash .agents/skills/mcp-server-trello-release/scripts/parity-check.sh
package.json version         1.8.0
server.json version          1.8.0
server.json packages[0]      1.8.0
src/index.ts McpServer info  1.8.0
CHANGELOG.md newest heading  1.8.0
✓ version parity: all 5 agree on 1.8.0
```

**No violation. Nothing to flag as critical.**

### ✅ 4. Fix round did not touch `src/trello-client.ts` or `src/types.ts` — **PASS**

```
$ git diff --name-only 7fda3d9 d33a2ac -- src/trello-client.ts src/types.ts
(empty — 0 lines)
```

Zero implementation change in the fix round, exactly as scoped: docs + tests + one
string. The `src/index.ts` fix-round delta is `1 insertion, 1 deletion` — the
description line and nothing else.

### ✅ 5. Fix-round commit contains no unrelated files — **PASS**

```
$ git diff --numstat 7fda3d9 d33a2ac
6	0	CHANGELOG.md
26	1	README.md
1	1	skill/references/trello-mcp/api.md
1	1	src/index.ts
30	0	tests/unit/trello-client.test.ts
```

Five files, every one of them expected. **None** of the working-tree noise (`_bmad/`,
`_bmad-output/`, `.agents/`, `mise.toml`, `agents/`, `.project.json`, `.plane.json`,
`.copier-answers.yml`, `.env.op`) made it into `d33a2ac`. The commit is clean.

---

## 4. New issues

**None at medium or above.** Four observations, all low or informational:

### 4a. LOW — `skill/references/trello-mcp/patterns.md:33-34` still implies the old array shape

```
1. Run `get_acceptance_criteria`.
2. Map each checklist item to the requested work.
```

Step 2 tells the agent to map over checklist items directly. Post-change the result
is a union — you must check `.found` and read `.items`. `api.md` (the API reference,
the surface the finding named) was fixed; this procedural sibling in the same skill
was not. An agent following `patterns.md` would iterate the union object.

*Why not higher:* the tool description, the tool's own zod schema, and `api.md` all
now state the union, and the very next thing the agent sees is the actual JSON
payload with `found` at the top. Self-correcting in practice.

### 4b. LOW — `examples/usage-examples.md:271` comment describes the old single-name behavior

```js
// Get all items from "Acceptance Criteria" checklist
const acceptanceCriteria = await use_mcp_tool({ … tool_name: "get_acceptance_criteria" … });
```

The comment restates the pre-change wording. Mitigating: the snippet never
dereferences `acceptanceCriteria` as an array, so no line of example code is
actually *wrong* — only the comment is now imprecise, and `Acceptance Criteria` is
still a valid alias. A one-line comment edit closes it.

### 4c. INFORMATIONAL (pre-existing, NOT a regression) — `skill/assets/source/` is a vendored snapshot pinned at 1.7.1

`skill/assets/source/src/trello-client.ts:747` still reads
`async getAcceptanceCriteria(…): Promise<CheckListItem[]>` delegating to
`getChecklistItems('Acceptance Criteria', …)`. This is the **old** implementation.

**This is not caused by this branch.** Verified at base `41bc348`: identical stale
content, and `skill/assets/source/package.json` reads `"version": "1.7.1"` — the
vendored tree lags mainline by a full minor release and was last touched in `e352df8`,
long before this work. It is a structural staleness of the skill's install-from-source
asset, and fixing it is out of MCPS-2's scope. Flagged only so it is not later
mistaken for drift this branch introduced.

### 4d. INFORMATIONAL — the *other* `Math.round` still has surviving floor/ceil mutants

`src/trello-client.ts:1131` (`convertToCheckList`, backing `get_checklist_by_name`)
has the same `Math.round((completed / total) * 100)` and only exact-rounding fixtures
(`percentComplete` assertions of `0` and `50` at `:661` and `:680`). Both mutants
survive there. **Correctly out of scope** — MCPS-2 is `get_acceptance_criteria` — but
it is the identical defect one function over, worth a follow-up ticket rather than
scope creep here.

---

## Answers to the four specific probes

**Q: README non-breaking-space consistency — does it now render badly?**
**No — and the new block is on the *correct* side of a pre-existing inconsistency.**

The file has two competing indentation styles inside its `typescript` fences: real
U+00A0 (`M-BM-` under `cat -A`) on most lines, and a **literal `nbsp;` text
artifact** on a handful — e.g. `README.md:259` renders the visible string
`nbsp; name: 'find_checklist_items_by_description',`. That's a pre-existing mangled
`&nbsp;` in the source.

Measured across the whole branch:

```
base 41bc348 lines containing literal "nbsp;":  6
head d33a2ac lines containing literal "nbsp;":  6
new lines added by the branch containing "nbsp;": 0
```

**The count is unchanged and the fix round added zero new instances.** Every added
line uses real U+00A0, i.e. the dominant and correct convention. The new
`get_acceptance_criteria` block is internally consistent end-to-end (open brace →
fields → close brace all U+00A0). The file was already mixed; this change did not
worsen it and did not touch the bad lines. Nothing renders worse than before.

**Q: Is `## [Unreleased]` a defect, or the correct consequence of "do not bump"?**
**It is not just correct — it is the shape the repo's release tooling *requires*.**

Two independent proofs:

1. **Precedent.** `git log -S"[Unreleased]" -- CHANGELOG.md` shows the repo has used
   this heading repeatedly. Release commit `5806416` did exactly one thing to it:
   `-## [Unreleased]` → `+## [1.8.0] - 2026-07-16`. Accumulate under `[Unreleased]`,
   promote at release, is this repo's established cycle.
2. **Tooling.** `.agents/skills/mcp-server-trello-release/scripts/set-version.sh`
   greps for `## \[Unreleased\]` and rewrites it to `## [X.Y.Z] - DATE`. If the
   heading is **absent** it emits `warning: no '## [Unreleased]' section in
   CHANGELOG.md — add a … section by hand`. So writing the entry under a versioned
   heading instead would have *broken* the release helper's happy path.

And it does not break the release gate: `parity-check.sh` extracts the newest
changelog version with `grep -m1 -oE '## \[[0-9]+\.[0-9]+\.[0-9]+\]'`, which skips
`[Unreleased]` (no digits) and correctly lands on `1.8.0`. **Verified by running it
— it passes** (output in §3.3). Nothing in `.github/workflows/` reads the CHANGELOG
at all, so there is no CI surface to break either. **Not a defect.**

**Q: BREAKING in prose only — real risk it ships as a minor from 1.8.0?**
**A real but correctly-handed-off process risk, not a defect in this commit. LOW.**

The risk is genuine. The repo's own semver rule
(`mcp-server-trello-release/SKILL.md:115-118`) defines **major** as "a breaking change
to the **published** tool surface," and `get_acceptance_criteria` *did* ship publicly
— `CHANGELOG.md:33` lists it under the released `[1.7.0]`. So by the repo's own
written rule, the next release carrying this is **2.0.0, not 1.9.0**. Meanwhile
`set-version.sh` takes the version as a hand-typed argument and `parity-check.sh`
only checks that five literals *agree*, not that the number is semantically right.
**There is no automated gate that would catch a 1.9.0 mistake.**

But: given that process, the prose marker is the strongest available signal, and this
entry deploys it well — `**BREAKING**` in bold as the very first token of the bullet,
the old and new shapes both spelled out, and the concrete caller-migration step. A
releaser who reads the changelog (which `set-version.sh` forces them to, since it
tells them to "fill in the bullets") cannot miss it. **Sufficient for whoever cuts the
next release.**

*Optional hardening, not required to close this finding:* append a
`> Next release must be a major (2.0.0) per the repo semver rule` line under the
`[Unreleased]` heading, so the bump size is stated rather than inferred. That is a
one-line docs nicety; I am **not** holding the verdict on it.

**Q: Does the trimmed description contradict README or `api.md`?**
**No.** Cross-checked all three: identical alias set, identical order, identical
`{found}` union, identical field names. The only deltas are omissions in the shorter
surfaces (the description and `api.md` both drop "whitespace-trimmed"; the
description drops the matched-but-empty note). **No statement in any of the three is
inconsistent with any statement in the other two, and none contradicts the
implementation.**

---

## 5. Check output

```
$ grep -c "registerTool(" src/index.ts
57
```

```
$ npm run typecheck

> @delorenj/mcp-server-trello@1.8.0 typecheck
> tsc --noEmit

(exit 0 — no diagnostics)
```

```
$ npx vitest run tests/unit

 RUN  v4.1.5 /home/delorenj/code/mcp-server-trello


 Test Files  8 passed (8)
      Tests  143 passed (143)
   Start at  13:30:54
   Duration  272ms (transform 355ms, setup 0ms, import 665ms, tests 165ms, environment 0ms)
```

```
$ node -e "const r=(c,t)=>({raw:(c/t)*100,round:Math.round((c/t)*100),floor:Math.floor((c/t)*100),ceil:Math.ceil((c/t)*100)});
           console.log('2/3',JSON.stringify(r(2,3))); console.log('1/3',JSON.stringify(r(1,3)));
           console.log('0/3',JSON.stringify(r(0,3))); console.log('1/2',JSON.stringify(r(1,2)));"
2/3 {"raw":66.66666666666666,"round":67,"floor":66,"ceil":67}
1/3 {"raw":33.33333333333333,"round":33,"floor":33,"ceil":34}
0/3 {"raw":0,"round":0,"floor":0,"ceil":0}
1/2 {"raw":50,"round":50,"floor":50,"ceil":50}
```

```
$ bash .agents/skills/mcp-server-trello-release/scripts/parity-check.sh
package.json version         1.8.0
server.json version          1.8.0
server.json packages[0]      1.8.0
src/index.ts McpServer info  1.8.0
CHANGELOG.md newest heading  1.8.0
✓ version parity: all 5 agree on 1.8.0
```

```
$ git diff --numstat 7fda3d9 d33a2ac
6	0	CHANGELOG.md
26	1	README.md
1	1	skill/references/trello-mcp/api.md
1	1	src/index.ts
30	0	tests/unit/trello-client.test.ts

$ git diff 41bc348 d33a2ac -- package.json server.json package-lock.json
(empty)

$ git diff --name-only 7fda3d9 d33a2ac -- src/trello-client.ts src/types.ts
(empty)
```

---

## 6. Reviewer identity

`mcps2-rereviewer (Agent tool, general-purpose, claude-opus-5[1m])`

Fresh reviewer — did not author the code, did not perform the prior reviews, no
inherited context. ACs were not re-litigated; nothing in the fix round touches
implementation logic, so no AC could have regressed. Repo files were not modified;
this report is the only write. Every claim above is backed by a command actually run
or a file actually read, quoted verbatim.
