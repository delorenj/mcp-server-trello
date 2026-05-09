# Enhancement Forge Anti-Patterns

Reference document for the Idea Selector and Proposal Writer to detect and avoid known failure modes. Loaded into sub-agent context.

---

## 1. The 1:1 Endpoint Wrapper

**Pattern:** Proposal exposes a new MCP tool that mirrors a single upstream API endpoint, name-for-name and parameter-for-parameter, with no abstraction or composition.

**Example smell:** "Add `set_card_due_date` MCP tool that calls the Trello `/1/cards/{id}/due` endpoint."

**Why it's bad:** The MCP server becomes a thin proxy. Agents calling it have to know Trello's mental model (CRUD on resources) instead of their own intent (scheduling work, setting deadlines, batch deferrals). Compounds verbosity in agent calls.

**When it IS okay:** Exposed primitive is genuinely composable and other higher-order tools don't yet exist to wrap it. In that case, the proposal must explicitly justify "this is a building block for higher-order tools coming later in vector X."

**Detection:** Idea text matches regex `/expose|wrap|add.*endpoint|mirror.*API/i` AND lacks a "higher-order" or "intent" justification clause.

---

## 2. Boil-the-Ocean Scope

**Pattern:** Proposal touches every module, refactors core, and adds 6+ new features under one issue.

**Example smell:** "Refactor the entire Trello client to use an event-driven architecture, add observability, write a new SDK, and migrate to Effect-TS."

**Why it's bad:** No architect or dev can pick this up. Sprawls into a multi-quarter program disguised as an issue.

**Detection:** `surfaceArea` > 5 files OR proposal body mentions 3+ orthogonal vectors.

**Mitigation:** Idea Selector should reject and ask Party Mode to split.

---

## 3. Vague Acceptance Criteria

**Pattern:** AC bullets like "Improve performance", "Make the API better", "Enhance UX".

**Why it's bad:** Not testable. Architect cannot decide "done."

**Detection:** AC bullet does not contain at least one observable verb (returns, equals, contains, fails when, completes within, raises, includes, less than, greater than, exactly).

**Mitigation:** Quality gate `hasTestableAcceptance` blocks the proposal.

---

## 4. Evidence-Free Justification

**Pattern:** Proposal claims "users want this" or "this is a pain point" without citing a real issue, PR comment, file path, or commit.

**Why it's bad:** Indistinguishable from speculation. Lowers trust in the forge.

**Detection:** `References` section has zero repo or GH citations.

**Mitigation:** Quality gate `hasRepoEvidence` blocks the proposal.

---

## 5. Implementation-Detail Proposal

**Pattern:** Proposal body is a code dump or detailed pseudocode rather than an interface contract.

**Why it's bad:** Conflates ideation with implementation. Forecloses architect/dev judgment on the right implementation. The forge's strict scope ends at the issue, not at the patch.

**Detection:** `Proposed Solution` body contains > 30% code-fenced content.

**Mitigation:** Proposal Writer rule: lead with intent and interface; defer implementation.

---

## 6. Cross-Cutting Without Explicit Acknowledgement

**Pattern:** Proposal silently affects auth, observability, or data model without flagging it.

**Why it's bad:** Cross-cutting changes need wider review. Hiding them in a single-vector proposal slips them past quality.

**Detection:** Proposal body mentions auth/permissions/logging/schema but `surfaceArea` doesn't include those modules.

**Mitigation:** Proposal Writer adds an explicit "Cross-cutting impacts" callout if applicable, expanding `surfaceArea` honestly.

---

## 7. Reinventing an Existing Tool

**Pattern:** Proposal duplicates functionality already implemented in the project.

**Why it's bad:** Wastes review cycles; creates inconsistency.

**Detection:** Idea title fuzzy-matches an existing tool name in `discovery.repo_findings.tools_exposed`.

**Mitigation:** Idea Selector flags via `antiPatternRisks: ["duplicates_existing:tool_name"]` and prefers a different idea.

---

## Detection Checklist (Idea Selector applies before scoring)

For each candidate idea, scan for:

- [ ] 1:1 endpoint wrapper smell? → flag, deprioritize unless justified
- [ ] Boil-the-ocean scope? → flag, prefer a tighter alternative
- [ ] Vague language that telegraphs vague AC? → flag
- [ ] Evidence-free claims? → flag
- [ ] Implementation-detail tone? → demote (Writer can fix later, but prefer interface-shaped ideas)
- [ ] Cross-cutting silently? → flag
- [ ] Duplicates existing tool? → flag, prefer alternative
