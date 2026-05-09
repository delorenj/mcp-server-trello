---
name: 'step-02-discovery'
description: 'Scan repo and GitHub state in parallel; emit a structured discovery report consumed by vector selection'

nextStepFile: './step-03-vector-select.md'
runJournalFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/run.md'
discoveryReportFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/discovery.json'
scannerAgentFile: '../data/sub-agents/scanner.md'
ledgerFile: '{project-root}/_bmad-output/enhancement-forge/ledger.yaml'
---

# Step 2: Discovery (Parallel Repo + GH Scan)

## STEP GOAL:

Produce a structured discovery report capturing the current state of the repo and GitHub surface, used by Vector Selection to pick the highest-leverage improvement direction.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER generate findings without scanning real sources
- 📖 CRITICAL: Read complete step file before action
- 🔄 CRITICAL: When loading next step with 'C', read entire file
- 📋 YOU ARE A FACILITATOR

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward**, dispatching the Scanner sub-agents
- ✅ Sub-agents do the work; you aggregate and validate

### Step-Specific Rules:
- 🎯 Pattern 4 (parallel) + Pattern 1 (grep): launch two Scanner subprocesses concurrently (Repo Scanner, GH Scanner)
- 💬 Subprocesses return structured findings JSON, not raw content
- 🚫 DO NOT BE LAZY: each subprocess must produce findings; do not stub
- ⚙️ TOOL/SUBPROCESS FALLBACK: if subprocess capability unavailable, perform both scans serially in main thread
- 🚫 FORBIDDEN to begin idea selection or proposal drafting in this step

## EXECUTION PROTOCOLS:
- 🎯 Load `{scannerAgentFile}` to get the Scanner system prompt
- 💾 Write the structured discovery report to `{discoveryReportFile}`
- 📖 Append a Step 02 summary section to the run journal
- 🛡️ Apply `gh` rate-limit awareness: cache results, avoid redundant calls

## CONTEXT BOUNDARIES:
- Available context: run journal frontmatter, ledger (read-only)
- Focus: scanning and structuring; no judgment calls about which finding matters most
- Limits: do not write to ledger or proposals folder
- Dependencies: step-01-init must have created the run journal and verified env

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 1. Load Scanner Sub-Agent Definition

Load `{scannerAgentFile}`. Use its system prompt for both subprocess invocations.

### 2. Launch Subprocesses in Parallel

**Pattern 4 + Pattern 1.**

Launch two Scanner Agent subprocesses concurrently:

**Subprocess A: Repo Scanner**
- Inputs: project root, glob patterns for source/docs (`src/**`, `docs/**`, `docs/mcp-documentation.md`, `README.md`, `package.json`)
- Tasks:
  - Inventory exposed MCP tools (parse `src/index.ts`)
  - Identify TODO/FIXME comments and their density per module
  - Detect missing observability (no structured logging, no metrics) per module
  - Detect undocumented tools (in code but not in `docs/mcp-documentation.md` or README)
  - Note recent significant churn (`git log --since=30.days --name-only` aggregated)
- Output: `repo_findings` JSON section per `discovery-report-schema` (see step rules below)

**Subprocess B: GH Scanner**
- Inputs: `gh` CLI authenticated, repo owner/name from `git remote get-url origin`
- Tasks:
  - Fetch open issues (last 30) with labels and reaction counts
  - Fetch recent PRs (last 20) with comment threads
  - Fetch discussions if enabled
  - Detect duplicate-issue clusters by title similarity
  - Identify recurring user pain themes from issue bodies and PR comments
- Output: `gh_findings` JSON section

### 3. Aggregate into Discovery Report

Wait for both subprocesses; merge into a single JSON document at `{discoveryReportFile}`:

```json
{
  "schema_version": 1,
  "runId": "...",
  "scannedAt": "...",
  "repo_findings": { "tools_exposed": [...], "todo_density_by_module": {...}, "observability_gaps": [...], "undocumented_tools": [...], "recent_churn": [...] },
  "gh_findings": { "open_issues": [...], "recent_prs": [...], "user_pain_themes": [...], "duplicate_clusters": [...] }
}
```

### 4. Read Ledger Cooldowns

Load `{ledgerFile}`. For each entry in last 5 ledger rows, extract its `vector` to compute a "recently used" set used by Vector Selector.

### 5. Append Step 02 Summary to Run Journal

Append `## Step 02: Discovery` section listing:
- Counts: tools exposed, TODOs, observability gaps, undocumented tools, open issues, PRs, pain themes
- Path to full discovery JSON
- Recently-used vectors set from ledger

Update frontmatter: `stepsCompleted += step-02-discovery`, `lastStep: step-02-discovery`, `discovery.repoFindingsCount`, `discovery.ghFindingsCount`.

### 6. Present MENU OPTIONS

Display:

```
Step 02 (Discovery) complete. Findings: {repo_count} repo / {gh_count} GH.

[C] Continue to Vector Selection
[A] Advanced Elicitation (challenge findings)
[X] Abort run
```

#### Menu Handling Logic:
- IF C: load and read entire `{nextStepFile}`, then execute it
- IF A: Execute advanced-elicitation, redisplay menu
- IF X: mark run aborted, halt
- Cron mode: auto-select C
- IF Any other: help, redisplay

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Both subprocess scans completed (or graceful main-thread fallback documented)
- Discovery report written to disk in valid JSON
- Ledger cooldowns extracted
- Run journal updated with summary

### ❌ SYSTEM FAILURE:
- Stubbing findings without real scans
- Missing fallback when subprocess unavailable
- Writing to proposals/ledger in this step

**Master Rule:** Discovery is observation, not interpretation. Save the judgment for step-03.
