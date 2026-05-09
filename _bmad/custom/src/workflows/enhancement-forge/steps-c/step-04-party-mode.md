---
name: 'step-04-party-mode'
description: 'Invoke BMAD Party Mode as a sub-workflow with a seeded prompt biased toward abstraction-up ideation'

nextStepFile: './step-05-idea-select.md'
runJournalFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/run.md'
discoveryReportFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/discovery.json'
partyModeWorkflow: '{project-root}/.agents/skills/bmad-party-mode/SKILL.md'
partyModeSeedFile: '../data/party-mode-seed.md'
antiPatternsFile: '../data/anti-patterns.md'
ideationOutputFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/ideation.md'
---

# Step 4: Party Mode Ideation

## STEP GOAL:

Invoke BMAD Party Mode as a sub-workflow seeded with the selected vector and discovery findings, biasing the multi-agent conversation toward abstraction-up proposals over 1:1 wrappers.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER skip Party Mode in favor of single-agent ideation
- 📖 CRITICAL: Read complete step file before action
- 📋 YOU ARE A FACILITATOR (Party Mode does the divergent thinking)

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** seeding Party Mode with strict constraints
- ✅ You do not participate in Party Mode's conversation directly
- ⚙️ TOOL FALLBACK: if Party Mode workflow is unreachable, fall back to `brainstorming` task with the same seed prompt

### Step-Specific Rules:
- 🎯 Pin the abstraction-up constraint (load `{antiPatternsFile}`) into the seed prompt
- 🚫 FORBIDDEN to converge on a single idea here (that's step-05)
- 💬 Capture the full divergent idea set
- 🔒 Cron mode: same as interactive; Party Mode is fully autonomous

## EXECUTION PROTOCOLS:
- 🎯 Compose seed prompt from `{partyModeSeedFile}` template
- 💾 Persist Party Mode output to `{ideationOutputFile}`
- 📖 Append `## Step 04: Ideation` section to run journal with idea count and seed used

## CONTEXT BOUNDARIES:
- Available: vector selection, discovery JSON, anti-patterns reference
- Focus: divergence; do not converge
- Limits: do not write to ledger, proposals, or vectors file
- Dependencies: step-03 must have selected a vector

## MANDATORY SEQUENCE

### 1. Compose Seed Prompt

Load `{partyModeSeedFile}` and `{antiPatternsFile}`. Render the seed by interpolating:
- Selected vector name and description (from vectors file)
- 5 highest-signal items from discovery report (top TODOs, top user pain themes, etc.)
- Anti-pattern guardrail: "Strongly prefer higher-order abstractions over 1:1 endpoint wrappers."

The composed seed must be self-contained so Party Mode agents have full context.

### 2. Invoke Party Mode

Execute `{partyModeWorkflow}` as a sub-workflow with the composed seed as input. Allow Party Mode to manage its own internal conversation (turn-taking, persona selection, synthesis).

Capture all generated ideas plus their authoring persona and rationale.

### 3. Normalize Ideation Output

Write `{ideationOutputFile}` with this structure:

```markdown
---
runId: ...
vector: ...
seedHash: ...
generatedAt: ...
---

# Ideation Output

## Seed
[The exact seed prompt used]

## Ideas

### Idea 1: {title}
- Author persona: {persona}
- Rationale: {rationale}
- Abstraction-up score (self-rated): {0.0-1.0}
- Surface area (claimed): [...]

### Idea 2: ...
```

### 4. Append Step 04 Summary to Run Journal

- Idea count, top-3 abstraction-scored ideas (titles only), path to ideation file
- Update frontmatter `stepsCompleted += step-04-party-mode`, `lastStep: step-04-party-mode`

### 5. Present MENU OPTIONS

Display:

```
Step 04 (Party Mode) complete. {N} ideas generated. Output: {ideationOutputFile}

[C] Continue to Idea Selection (Step 05)
[R] Re-run Party Mode (different seed framing)
[X] Abort
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF R: regenerate seed (allow user to tweak constraint emphasis), re-invoke Party Mode, redisplay
- IF X: mark aborted, halt
- Cron mode: auto-select C

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Party Mode invoked with vector + discovery + anti-patterns context
- Ideation output captured to disk in normalized format
- At least 3 distinct ideas generated
- Run journal updated

### ❌ SYSTEM FAILURE:
- Skipping Party Mode for shortcut single-agent ideation
- Failing to seed the abstraction-up constraint
- Converging on a single idea here
- Capturing only one idea (insufficient divergence)

**Master Rule:** Party Mode diverges. Step 05 converges. Don't blur the line.
