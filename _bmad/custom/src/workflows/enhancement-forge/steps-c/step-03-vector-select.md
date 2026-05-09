---
name: 'step-03-vector-select'
description: 'Choose exactly one improvement vector for this run, with reasoning + dedup against ledger; CHECKPOINT 1'

nextStepFile: './step-04-party-mode.md'
runJournalFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/run.md'
discoveryReportFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/discovery.json'
improvementVectorsFile: '{project-root}/_bmad-output/enhancement-forge/improvement-vectors.md'
ledgerFile: '{project-root}/_bmad-output/enhancement-forge/ledger.yaml'
vectorSelectorAgentFile: '../data/sub-agents/vector-selector.md'
confidenceThreshold: 0.7
dedupDistanceThreshold: 0.5
maxRegens: 2
---

# Step 3: Vector Selection (CHECKPOINT 1)

## STEP GOAL:

Select exactly one improvement vector for this run, with explicit reasoning and dedup citation. This is the first user checkpoint.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER select without invoking the Vector Selector sub-agent
- 📖 CRITICAL: Read complete step file before action
- 📋 YOU ARE A FACILITATOR

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward**, brokering the Vector Selector's recommendation
- ✅ You do not pick the vector; the sub-agent does, with cooldown weighting

### Step-Specific Rules:
- 🎯 Pattern 3 (data ops): subprocess loads ledger and computes cooldown weights
- 🎯 CHECKPOINT 1: user must approve vector before continuing
- 🚫 FORBIDDEN to skip user approval in interactive mode
- 🚫 FORBIDDEN to invoke Party Mode here
- 🔒 Cron mode: if `confidence >= confidenceThreshold` and `dedupDistance >= dedupDistanceThreshold`, auto-approve and queue notification; else halt and queue for morning review

## EXECUTION PROTOCOLS:
- 🎯 Load `{vectorSelectorAgentFile}` for sub-agent prompt
- 💾 Persist selection to run journal frontmatter `vectorSelection`
- 📖 Append `## Step 03: Vector Selection` section with full reasoning

## CONTEXT BOUNDARIES:
- Available context: discovery JSON, vectors file, ledger
- Focus: pick one vector, justify it, dedup against recent runs
- Limits: do not draft proposals or scope ideas
- Dependencies: step-02-discovery completed

## MANDATORY SEQUENCE

### 1. Invoke Vector Selector Sub-Agent

Spawn an Agent (subprocess) with system prompt from `{vectorSelectorAgentFile}` and inputs:
- `{discoveryReportFile}` (full)
- `{improvementVectorsFile}` (full, including weights and cooldowns)
- Last 10 ledger entries (for dedup-distance computation)

Sub-agent must return JSON:

```json
{
  "vector": "UX/Ergonomics",
  "confidence": 0.82,
  "dedupDistance": 0.71,
  "reasoning": "...",
  "evidenceCitations": ["src/trello-client.ts:142", "issue#118"],
  "consideredAlternatives": [{"vector": "Observability", "rejectedBecause": "..."}]
}
```

### 2. Validate Sub-Agent Output

- All required fields present
- `vector` is in `{improvementVectorsFile}`
- `evidenceCitations` non-empty (at least one repo or GH reference)

If invalid: regenerate up to `{maxRegens}`. After max, halt with diagnostic.

### 3. Confidence + Dedup Gate

- If `confidence < {confidenceThreshold}` OR `dedupDistance < {dedupDistanceThreshold}`:
  - Interactive: surface warning to user with explanation; user can accept, reject (regen), or override vector
  - Cron: queue for morning review, mark run journal `status: queued_for_review`, halt

### 4. CHECKPOINT 1: User Approval (Interactive Mode)

Display:

```
Vector Selector recommends: {vector}
Confidence: {confidence}  | Dedup distance: {dedupDistance}

Reasoning:
{reasoning}

Evidence:
- {evidenceCitations}

Considered alternatives:
- {consideredAlternatives}

[A]ccept  [R]egenerate  [O]verride (pick a different vector)  [X] Abort
```

Cron mode: skip prompt if confidence and dedup gates passed.

### 5. Persist Selection

Update run journal frontmatter:
- `vectorSelection.vector`, `.confidence`, `.dedupDistance`, `.approvedAt`
- `stepsCompleted += step-03-vector-select`, `lastStep: step-03-vector-select`

Append `## Step 03: Vector Selection` to journal body with full sub-agent JSON.

### 6. Present MENU OPTIONS

Display:

```
Vector locked: {vector}.

[C] Continue to Party Mode (Step 04)
[A] Advanced Elicitation (challenge selection)
[X] Abort
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF A: advanced-elicitation, redisplay
- IF X: mark aborted, halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- One vector selected with reasoning + evidence + alternatives
- Confidence and dedup gates passed (or escalated correctly)
- User approved (or cron auto-approved per thresholds)
- Run journal updated

### ❌ SYSTEM FAILURE:
- Selecting without sub-agent
- Missing evidence citations
- Skipping user approval in interactive mode
- Auto-approving in cron mode without meeting thresholds

**Master Rule:** Selection is a sub-agent's job; approval is the user's. Both are required.
