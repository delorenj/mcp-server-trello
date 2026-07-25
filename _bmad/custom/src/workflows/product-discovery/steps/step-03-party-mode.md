---
name: 'step-03-party-mode'
description: 'Invoke BMAD Party Mode as a sub-workflow, seeded with discovery + doctrine constraints, for divergent product ideation'

nextStepFile: './step-04-idea-select.md'
runJournalFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/run.md'
discoveryReportFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/discovery.json'
partyModeWorkflow: '{project-root}/.agents/skills/bmad-party-mode/SKILL.md'
partySeedFile: '../data/party-seed.md'
ideationOutputFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/ideation.md'
---

# Step 3: Party Mode Product Ideation

## STEP GOAL:

Run BMAD Party Mode as a **real multi-agent roundtable** (independent subagents, not roleplay) seeded with the discovery report and the doctrine's hard constraints, producing a divergent set of product ideas.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER skip Party Mode in favor of single-agent ideation — independent perspectives are the point
- 🛑 NEVER use `--solo` mode unless the operator explicitly asks; converged fake disagreement is worse than no party
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Discovery Steward** seeding Party Mode; you do not speak in the roundtable yourself
- ⚙️ TOOL FALLBACK: if Party Mode workflow is unreachable, fall back to the `bmad-brainstorming` skill with the same seed — and record the fallback in the journal

### Step-Specific Rules:
- 🚫 FORBIDDEN to converge on a single idea here (that's step-04)
- 💬 Capture the full divergent set, including ideas you personally dislike
- 🎯 Suggested voices for product discovery: **Mary** (analyst — demand evidence), **John** (PM — value/fit), **Sally** (UX — user reality), **Winston** (architect — feasibility). Add or swap per the run focus; rotate if a voice dominates.

## MANDATORY SEQUENCE

### 1. Compose the Seed

Load `{partySeedFile}` and `{discoveryReportFile}`. Render the seed interpolating:
- `runFocus` (or "open field within the doctrine")
- Top-5 demand signals (with their markers — agents must know what is VERIFIED)
- The doctrine's current vein and falsified constraints (ideas must not resurrect falsified claims)
- The kill-shot gates as one-liners (agents ideate better when they know the bar)

Keep the composed seed under ~1500 words; it must be self-contained.

### 2. Invoke Party Mode

Execute `{partyModeWorkflow}` as a sub-workflow with the composed seed. Per the Party Mode protocol: spawn each agent as its own subagent, in parallel, with the seed as context. Allow cross-talk rounds (agents reacting to each other) for at least one round — the best ideas usually arrive as amendments.

Target: **5–8 distinct ideas.** Capture each idea's authoring persona and rationale.

### 3. Normalize Ideation Output

Write `{ideationOutputFile}`:

```markdown
---
runId: ...
seedHash: ...
generatedAt: ...
voices: [mary, john, sally, winston]
---

# Ideation Output

## Seed
[The exact seed prompt used]

## Ideas

### Idea 1: {title}
- Author persona: {persona}
- Rationale: {rationale}
- Demand signal cited: {which signal from discovery}
- Slot classification (claimed): tool | param | default-flip | response-shape
- What it retires (claimed): {name or "nothing — addition only"}

### Idea 2: ...
```

### 4. Append `## Step 03: Party Mode` to Run Journal

Idea count, voices used, one-line titles, path to ideation file.

- `stepsCompleted += step-03-party-mode`, `lastStep: step-03-party-mode`

### 5. Present MENU OPTIONS

```
Step 03 (Party Mode) complete. {N} ideas from {V} voices. Output: {ideationOutputFile}

[C] Continue to Idea Selection / Gate Scoring (Step 04)
[R] Re-run Party Mode (different seed framing or voices)
[X] Abort
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF R: collect seed tweaks (framing, voices, constraints), re-invoke Party Mode, redisplay
- IF X: mark aborted, halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Real subagent Party Mode with ≥3 voices and ≥1 cross-talk round
- ≥3 distinct ideas captured with persona + rationale + cited demand signal
- Every idea carries a claimed slot classification

### ❌ SYSTEM FAILURE:
- Solo-mode roleplay presented as a party (without explicit operator request)
- Converging on a winner here
- Ideas with no cited demand signal admitted into the output

**Master Rule:** Party Mode diverges. Step 04 converges. Don't blur the line.
