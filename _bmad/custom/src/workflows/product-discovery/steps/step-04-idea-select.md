---
name: 'step-04-idea-select'
description: 'Converge: score every idea through the doctrine gates in kill-shot order, extract the single best idea, checkpoint with operator'

nextStepFile: './step-05-idea-define.md'
runJournalFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/run.md'
ideationOutputFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/ideation.md'
evaluationFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/evaluation.md'
gatesRubricFile: '../data/gates-rubric.md'
doctrineSkill: '{project-root}/.agents/skills/mcp-server-trello-product-doctrine/SKILL.md'
---

# Step 4: Gate Scoring + Best-Idea Extraction

## STEP GOAL:

Run every idea through the doctrine's gates **in kill-shot order**, verify any claim doing real work, and extract exactly one winner — with the corpses of the losers recorded so they don't get relitigated.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER let a BELIEVED claim kill an idea — verify first, or keep the idea alive and mark the claim
- 🛑 NEVER advance an idea that fails a kill-shot gate (1–3), no matter how beloved
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Discovery Steward** as **Bar Raiser** here — this is the step the whole pipeline exists for
- ⚖️ The full gate text lives in `{doctrineSkill}`; `{gatesRubricFile}` is the scoring worksheet, not a replacement

## MANDATORY SEQUENCE

### 1. Score Every Idea

Load `{gatesRubricFile}`, `{ideationOutputFile}`, and the killed-ideas list from step-01 hindsight. For each idea, evaluate in order — **stop at the first kill**:

1. **Prior kill check** — was this (or its parent concept) killed before? If the kill reason still stands, it dies here with a citation.
2. **GATE 1 — Convention:** does the data it reads exist on a live board, written by nobody, unprompted? Convened data → name the writer tool or stop.
3. **GATE 2 — Loop:** if it reads, who writes? If it writes, who reads? Half a loop scores zero unless the writer half ships first.
4. **GATE 3 — Frequency × judgment:** estimate honest invocation frequency. Quarterly-with-brilliant-judgment loses.
5. **GATE 4 — Slot ledger:** verify the claimed classification (tool/param/default-flip/response-shape). Name what it retires. "Nothing" requires an argument.
6. **GATE 5 — Find-and-replace (in scope only):** generic-and-claims-judgment is fatal; genuine compression is exempt.
7. **North Star:** could a competent LLM do this in 3 existing calls with no real loss? Only capability, compression-before-payment, or determinism excuse it.

**Verify before it counts:** any factual claim doing load-bearing work in a kill or a save gets run as a command **now** and marked VERIFIED — or the idea is scored with the claim marked BELIEVED and the decision deferred to the operator at checkpoint.

### 2. Apply the Standing Tests to Survivors

For ideas that clear all gates: silent-wrong behavior, division of labor, board shape, mutation trust, demand (behavioral only), surfaced-not-queried. Record pass/concern per test.

### 3. Write `{evaluationFile}`

```markdown
# Gate Evaluation — {runId}

## Verdicts

### Idea 1: {title} — KILLED at Gate {N}
- Kill reason: {one line}
- Claim status: {VERIFIED cmd | BELIEVED}
- Relitigation note: {what would have to change for this to be worth revisiting}

### Idea 2: {title} — SURVIVED
- Gate record: {one line per gate}
- Standing test concerns: {list or "none"}
- Net slot effect: {+1 tool | flat (param/flip) | -1 (retires X)}

## Winner: {title}
- Why it beats the other survivors: {frequency × judgment × slot math, one paragraph}
- Residual BELIEVED claims the operator is accepting: {list or "none"}
```

### 4. Append Corpses to Hindsight

For every killed idea:

```bash
hindsight memory retain <projectSlug> "Killed product idea '{title}': {kill reason, gate, date}" --context preferences
```

### 5. CHECKPOINT 1 — Operator Confirms the Winner

Present the evaluation summary (winner + one-line kill reasons) and halt:

```
Winner: {title} — {one-line pitch}
Killed: {N} ideas (gates cited in evaluation.md)

[C] Confirm winner — continue to Definition (Step 05)
[S] Select a different survivor instead
[R] Return to Party Mode (Step 03) — none of these clear the bar
[X] Abort
```

#### Menu Handling Logic:
- IF C: record `ideaSelection` in frontmatter, load and execute `{nextStepFile}`
- IF S: operator picks a survivor; record the override + reason in the journal, continue
- IF R: mark evaluation as superseded, load step-03
- IF X: mark aborted, halt (corpses are already retained — the run was not wasted)

### 6. Update State

- `stepsCompleted += step-04-idea-select`, `lastStep: step-04-idea-select`
- `ideaSelection.ideaTitle`, `.slotClassification`, `.retires`, `.approvedAt`

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Every idea has a verdict with a gate citation
- Load-bearing claims verified or explicitly deferred to the operator
- Corpses retained to hindsight with kill reasons
- Operator confirmed the winner

### ❌ SYSTEM FAILURE:
- A BELIEVED claim silently killing or saving an idea
- Auto-advancing without CHECKPOINT 1
- Re-proposing a previously killed idea without addressing its kill reason

**Master Rule:** Bring the corpse, not the brochure. A clean kill is a successful run.
