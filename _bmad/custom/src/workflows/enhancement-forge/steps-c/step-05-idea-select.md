---
name: 'step-05-idea-select'
description: 'Pick exactly one idea from Party Mode output, run Adv Elicit critique, justify abstraction-up; CHECKPOINT 2'

nextStepFile: './step-06-proposal-draft.md'
runJournalFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/run.md'
ideationOutputFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/ideation.md'
ideaSelectorAgentFile: '../data/sub-agents/idea-selector.md'
advancedElicitationTask: '{project-root}/.agents/skills/bmad-advanced-elicitation/SKILL.md'
antiPatternsFile: '../data/anti-patterns.md'
partyModeStepFile: './step-04-party-mode.md'
abstractionScoreThreshold: 0.65
confidenceThreshold: 0.7
maxRegens: 2
---

# Step 5: Idea Selection + Critique (CHECKPOINT 2)

## STEP GOAL:

Converge on exactly one idea from the divergent set, run an Advanced Elicitation pass for Socratic and counterfactual critique, justify abstraction-up alignment, and gate at user CHECKPOINT 2.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER select without invoking the Idea Selector sub-agent + Advanced Elicitation
- 📖 CRITICAL: Read complete step file before action
- 📋 YOU ARE A FACILITATOR

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward**, brokering convergence
- ✅ The Idea Selector picks; Adv Elicit critiques; you aggregate

### Step-Specific Rules:
- 🎯 CHECKPOINT 2: user must approve idea before drafting
- 🚫 FORBIDDEN to begin proposal drafting in this step
- 🚫 FORBIDDEN to bypass anti-patterns check
- 🔒 Cron mode: auto-approve if `abstractionScore >= threshold` AND `confidence >= threshold` AND Adv Elicit returns no blocking flags

## EXECUTION PROTOCOLS:
- 🎯 Sub-agent → Adv Elicit critique → user gate
- 💾 Persist selected idea to run journal frontmatter `ideaSelection`
- 📖 Append `## Step 05: Idea Selection` with full reasoning + critique

## CONTEXT BOUNDARIES:
- Available: ideation file, anti-patterns, vector selection
- Focus: convergence with quality critique
- Limits: do not draft the proposal artifact (step-06)
- Dependencies: step-04 ideation completed

## MANDATORY SEQUENCE

### 1. Invoke Idea Selector Sub-Agent

Spawn an Agent with system prompt from `{ideaSelectorAgentFile}` and inputs:
- Full `{ideationOutputFile}`
- `{antiPatternsFile}` (anti-pattern detection rules)
- Selected vector

Sub-agent must return JSON:

```json
{
  "ideaId": "...",
  "title": "...",
  "abstractionScore": 0.82,
  "confidence": 0.78,
  "rationale": "...",
  "antiPatternRisks": [],
  "alternativesConsidered": [{"ideaId": "...", "rejectedBecause": "..."}]
}
```

### 2. Validate and Regen if Needed

- All fields present, `ideaId` exists in ideation file
- If `abstractionScore < threshold` and `antiPatternRisks` non-empty: regen up to `{maxRegens}` instructing the sub-agent to bias higher

### 3. Run Advanced Elicitation Critique

Execute `{advancedElicitationTask}` against the selected idea, requesting:
- Socratic interrogation (what if user doesn't actually need this?)
- Counterfactual (what if we did the opposite?)
- Steelman of alternatives the sub-agent rejected

Capture the critique output as a `critique` block.

### 4. CHECKPOINT 2: User Approval (Interactive)

Display:

```
Idea Selector recommends: {title}
Abstraction-up score: {abstractionScore}  | Confidence: {confidence}

Rationale:
{rationale}

Critique (Advanced Elicitation):
{critique}

Anti-pattern risks: {antiPatternRisks}
Alternatives considered: {alternativesConsidered}

[A]ccept  [R]egenerate  [B]ack to Party Mode (re-diverge)  [O]verride (pick a different idea)  [X] Abort
```

Cron mode: auto-approve if all gates pass; halt+queue otherwise.

### 5. Persist Selection

Update run journal frontmatter `ideaSelection.{ideaId, abstractionScore, confidence, approvedAt}`.
Append `## Step 05: Idea Selection` body section with sub-agent JSON + critique.
`stepsCompleted += step-05-idea-select`, `lastStep: step-05-idea-select`.

### 6. Present MENU OPTIONS

Display:

```
Idea locked: {title}.

[C] Continue to Proposal Drafting (Step 06)
[A] Advanced Elicitation (additional critique)
[X] Abort
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF A: re-run advanced-elicitation, redisplay
- IF B (user redirect from above checkpoint): jump back to `{partyModeStepFile}`
- IF X: mark aborted, halt
- Cron: auto-select C

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- One idea selected with reasoning + critique + alternatives
- Abstraction-up gate passed
- Anti-pattern risks surfaced and addressed
- User approved (or cron auto-approved per thresholds)

### ❌ SYSTEM FAILURE:
- Selecting without sub-agent + Adv Elicit
- Bypassing anti-patterns check
- Skipping checkpoint in interactive mode
- Beginning proposal drafting in this step

**Master Rule:** Convergence with critique. No critique = no convergence.
