---
name: 'step-02-discovery'
description: 'Scan doctrine, demand signals, and market state into a normalized discovery report'

nextStepFile: './step-03-party-mode.md'
runJournalFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/run.md'
discoveryReportFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/discovery.json'
doctrineSkill: '{project-root}/.agents/skills/mcp-server-trello-product-doctrine/SKILL.md'
---

# Step 2: Product Discovery Scan

## STEP GOAL:

Assemble the raw material Party Mode will ideate against: current doctrine state, **behavioral** demand signals, and market movement — normalized into `discovery.json`, every claim marked VERIFIED / BELIEVED / FALSIFIED.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER present inferred demand ("every dev has this pain") as real demand — behavioral evidence or marked BELIEVED
- 📖 CRITICAL: Read complete step file before action
- ⚖️ Every claim in the report carries its epistemic marker and, when VERIFIED, the command that proved it

### Role Reinforcement:
- ✅ You are the **Discovery Steward** gathering evidence; judgment happens in step-04
- ⚙️ TOOL FALLBACK: if network access fails, run a local-only scan (doctrine + tracker via `gh` + hindsight) and mark market items BELIEVED

## MANDATORY SEQUENCE

### 1. Doctrine State (from `{doctrineSkill}`)

Extract, with the doctrine's own caveats:
- The roadmap tiers and what is **currently unblocked** (note the release/adoption state — verify, don't quote stale numbers)
- The ranked "vein" (highest-evidence territories)
- The falsified-claims graveyard (these constrain ideation — a falsified moat is not a moat)
- Open blind spots the doctrine itself names

Re-run any load-bearing number the doctrine flags as overdue (e.g. tool count: `grep -c "registerTool(" src/index.ts`; release state: `npm view @delorenj/mcp-server-trello version`). Record the commands.

### 2. Demand Signals (behavioral only)

- **Issue tracker:** `gh issue list --state open --limit 50` — segment pre/post latest release; the doctrine warns the tracker is a **contaminated instrument** (requests for already-shipped features measure the publish failure, not demand). Tag each signal accordingly.
- **PR history:** repeated independent requests for the same capability (e.g. `gh pr list --state all --search "search"`) count as demand.
- **Third-party behavior:** tutorials, integrations, or public loops hand-assembled on this server (check hindsight from step-01; web search if available).
- **Community revolts / paid tools:** documented user uprisings or paid products proving willingness-to-pay in adjacent space.

### 3. Market Pulse

- Atlassian Trello MCP movement (shipped capabilities vs the doctrine's DEPRECATING list — has anything on the announced roadmap landed?)
- Competitor tool counts/positioning, only if quick to check; otherwise BELIEVED from doctrine.

### 4. Write `{discoveryReportFile}`

```json
{
  "runId": "...",
  "generatedAt": "...",
  "runFocus": "...",
  "doctrine": {
    "lastVerified": "...",
    "unblockedTiers": ["..."],
    "vein": ["..."],
    "falsifiedConstraints": ["..."],
    "openBlindSpots": ["..."]
  },
  "demandSignals": [
    {"signal": "...", "kind": "issue|pr|third-party|community|paid", "marker": "VERIFIED|BELIEVED", "evidence": "command or citation", "contaminated": true|false}
  ],
  "marketPulse": [
    {"claim": "...", "marker": "VERIFIED|BELIEVED", "evidence": "..."}
  ]
}
```

### 5. Append `## Step 02: Discovery` to Run Journal

Counts by signal kind, the top-5 highest-signal items, and any doctrine numbers re-verified this run.

- `stepsCompleted += step-02-discovery`, `lastStep: step-02-discovery`

### 6. Present MENU OPTIONS

```
Step 02 (Discovery) complete. {N} demand signals ({V} verified), {M} market notes. Report: {discoveryReportFile}

[C] Continue to Party Mode Ideation (Step 03)
[R] Re-run discovery with a different focus
[X] Abort
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF R: collect adjusted `runFocus`, re-run this step, redisplay
- IF X: mark aborted, halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- `discovery.json` written with markers on every claim
- Tracker signals segmented pre/post release
- Stale doctrine numbers re-verified or explicitly marked BELIEVED

### ❌ SYSTEM FAILURE:
- Quoting stale doctrine numbers as current fact
- Unmarked inferred demand
- Skipping the contamination segment on tracker signals

**Master Rule:** Discovery feeds ideation; it does not pre-judge it. Evidence now, verdicts in step-04.
