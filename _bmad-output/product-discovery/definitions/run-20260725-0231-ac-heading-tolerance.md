---
title: 'Make get_acceptance_criteria heading-tolerant with an honest not-found response'
ideaSlug: 'ac-heading-tolerance'
originRun: 'run-20260725-0231'
slotClassification: 'default-flip + response-shape'
netSlotEffect: 'flat'
retires: 'nothing — correctness fix on an existing registered tool'
approvedAt: '2026-07-25T03:12Z (CHECKPOINT 1)'
---

# Make get_acceptance_criteria heading-tolerant with an honest not-found response

## Problem

`get_acceptance_criteria` — the server's most differentiated capability (no competitor has any acceptance-criteria concept) — matches exactly one hardcoded checklist name, `'Acceptance Criteria'`, by case-insensitive equality (`src/trello-client.ts:778-779`, VERIFIED 2026-07-25). On every board that writes "AC", "DoD", or "Definition of Done", the tool returns `[]` **and never says why**. The caller cannot distinguish "this card has no acceptance criteria" from "the checklist is named something else." A read tool that is silently wrong trains agents to hallucinate past it and users to stop trusting it.

## Demand Evidence

- VERIFIED (code, this session): `src/trello-client.ts:778-779` — `getAcceptanceCriteria` passes the literal `'Acceptance Criteria'` to `getChecklistItems`, whose matcher is case-insensitive exact equality (`src/trello-client.ts:656-690`). Tool registered at `src/index.ts:1176`.
- VERIFIED (doctrine): the product doctrine names this fix as open Tier 0 work — "~5 lines, highest value-per-line in the repo" — and vein #3: "Zero competitors have any AC concept. It's two lines. It currently lies silently."
- BELIEVED (carried, not load-bearing): third parties hand-assembling the session loop invoke `get_acceptance_criteria` **by name** (sdlcnext tutorial; Composio documents the same loop). The fix stands on correctness alone even if this demand evaporates.

## Proposed Change

**Default flip + response-shape change on the existing tool. Zero new tools, zero new slots.**

1. Match checklists against a small **alias set** instead of the single literal: `Acceptance Criteria`, `AC`, `DoD`, `Definition of Done` — case-insensitive, trimmed, exact-equality against the set (deterministic; no fuzzy/regex semantics — division of labor).
2. When matched, return a structured result: `{ items, percentComplete, unmet, matchedChecklistName }` where `unmet` is the incomplete subset (doctrine-specified shape).
3. When **no** checklist matches, return an explicit not-found: `{ found: false, reason, availableChecklists }` naming the checklists that *do* exist on the card/board — never a bare `[]`.
4. Distinguish "matched checklist with zero items" (`{ found: true, items: [], percentComplete: 0, unmet: [], matchedChecklistName }`) from case 3.

## Gate Record (inherited from evaluation.md — not re-litigated)

- Gate 1 (Convention): PASS — descriptive convention discovered in the wild; people already name checklists these things.
- Gate 2 (Loop): PASS — reads ambient checklist data.
- Gate 3 (Frequency × judgment): PASS — rides the session loop; the judgment (which checklist is AC + honest refusal) is the product.
- Gate 4 (Slot ledger): PASS — 57 → 57 tools.
- Gate 5 (Find-and-replace): PASS — on Jira/Linear AC is a schema field; reading Trello checklist-name folklore is Trello-specific judgment.
- North Star: PASS — correctness/capability argument, not call-count.

## Functional Requirements

- FR1: `get_acceptance_criteria` matches checklists whose names case-insensitively equal any alias in {`Acceptance Criteria`, `AC`, `DoD`, `Definition of Done`} (whitespace-trimmed), on both the card-scoped and board-scoped code paths.
- FR2: On match, the tool returns `{ found: true, items, percentComplete, unmet, matchedChecklistName }` with `percentComplete` computed from item states and `unmet` containing the incomplete items.
- FR3: On no match, the tool returns `{ found: false, reason, availableChecklists }` where `availableChecklists` lists the names of the checklists actually present, so the caller can see *why* nothing matched.
- FR4: A matched-but-empty checklist returns `found: true` with empty `items`/`unmet` and `percentComplete: 0`, distinguishable from FR3's not-found.

## Acceptance Criteria

- AC1 (FR1): Given a card whose checklist is named "AC", the tool returns that checklist's items with `matchedChecklistName: "AC"` — covered by an automated test.
- AC2 (FR1): The same holds for checklists named "DoD", "Definition of Done", and mixed-case variants (e.g. "dod") — covered by automated tests.
- AC3 (FR2): A checklist with 4 items, 2 complete, returns `percentComplete: 50` and exactly the 2 incomplete items in `unmet` — covered by an automated test.
- AC4 (FR3): A card with checklists ["Backlog", "QA"] and no alias match returns `found: false`, a human-readable `reason`, and `availableChecklists: ["Backlog", "QA"]` — never a bare `[]` — covered by an automated test.
- AC5 (FR4): A card with an alias-named checklist containing zero items returns `found: true`, `items: []`, `unmet: []`, `percentComplete: 0` — distinguishable from AC4's response — covered by an automated test.
- AC6 (slot ledger + regression): `grep -c "registerTool(" src/index.ts` remains 57, and `npm run typecheck` passes clean.

## Non-Goals

- No fuzzy, partial, or semantic checklist-name matching (that's LLM work; the tool stays deterministic).
- No user-supplied `heading`/`name` override param (the default must just work; an override can be a follow-up if demand appears).
- No changes to other checklist tools (`get_checklist_items` generic path stays as-is).
- No new tools, no renames — the response shape versions in the payload (`found` discriminator), not the tool name.

## Verification Hints

- `npm run typecheck` (must stay clean — the gate that caught the 4 dead tools).
- `npx vitest run tests/unit` — new tests belong alongside `tests/unit/trello-client.test.ts`; mock the axios layer the way existing checklist tests do.
- `grep -c "registerTool(" src/index.ts` → 57.
- Stdio smoke (optional but decisive): call `get_acceptance_criteria` for a card whose AC checklist is named "DoD" and confirm items + `matchedChecklistName`; call it on a card with no alias checklist and confirm `found: false` with `availableChecklists`.
