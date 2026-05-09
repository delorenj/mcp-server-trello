---
name: 'step-01-init'
description: 'Initialize a forge run: detect prior in-progress run, verify environment, bootstrap improvement-vectors.md if missing'

nextStepFile: './step-02-discovery.md'
continueFile: './step-01b-continue.md'
runJournalTemplate: '../templates/run-journal-template.md'
defaultVectorsFile: '../data/default-improvement-vectors.md'
improvementVectorsFile: '{project-root}/_bmad-output/enhancement-forge/improvement-vectors.md'
improvementOutputFolder: '{project-root}/_bmad-output/enhancement-forge'
runsFolder: '{improvementOutputFolder}/runs'
ledgerFile: '{improvementOutputFolder}/ledger.yaml'
ledgerSchemaFile: '../data/ledger-schema.yaml'
proposalsFolder: '{improvementOutputFolder}/proposals'
---

# Step 1: Init

## STEP GOAL:

Initialize a forge run by detecting any prior in-progress run, verifying the environment (gh CLI, repo, ledger), and bootstrapping `improvement-vectors.md` if missing.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER generate content without user input (except when `cronMode: true` and thresholds documented)
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ⚙️ TOOL FALLBACK: If `gh` CLI is unavailable, attempt GitHub MCP; if both unavailable, halt with clear remediation

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward**, a senior engineering strategist
- ✅ Collaborative dialogue, not command-response (interactive mode); decisive thresholds (cron mode)
- ✅ You bring init-time discipline; user (or scheduler) brings authorization

### Step-Specific Rules:
- 🎯 Focus only on environment verification, prior-run detection, and vectors bootstrap
- 🚫 FORBIDDEN to begin discovery scanning here (that's step-02)
- 🚫 FORBIDDEN to write any proposal artifact in this step
- 💬 If `improvement-vectors.md` is missing, OFFER to bootstrap; do not silently create
- 🔒 If `cronMode: true`, auto-bootstrap missing vectors using `defaultVectorsFile` plus repo scan; record decision in run journal

## EXECUTION PROTOCOLS:
- 🎯 Detect prior in-progress run BEFORE creating a new one
- 💾 Create run journal from `runJournalTemplate`; assign ULID `runId` and human-readable `runSlug` (timestamp prefix)
- 📖 Update `stepsCompleted` to include `step-01-init` only after the step's success criteria are met
- 🛡️ Validate ledger file exists or create empty one with `ledger_version: 1` header

## CONTEXT BOUNDARIES:
- Available context: project root, BMAD config, invocation mode (`create` or `cron`)
- Focus: setup, not analysis
- Limits: do not invoke sub-agents; do not call `gh` for issue creation
- Dependencies: none (this is the first step)

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Detect Prior In-Progress Run

- Scan `{runsFolder}` for run directories with `status: in_progress` in their `run.md` frontmatter
- If one or more found:
  - Interactive mode: list them and ask "Resume which run, or start fresh?" Options: pick one (route to `{continueFile}`), start fresh (proceed), abort (halt).
  - Cron mode: if a run started within the last 24h is in_progress, route to `{continueFile}`; otherwise start fresh and mark stale runs `status: aborted`.
- If none found: proceed.

### 2. Verify Environment

Check, in order, halting with remediation guidance on first failure:

- `git rev-parse --is-inside-work-tree` returns true
- `gh auth status` succeeds (or GitHub MCP is reachable as fallback)
- `{improvementOutputFolder}` exists or is creatable; ensure `runs/`, `proposals/` subfolders
- `{ledgerFile}` exists; if missing, create with header `ledger_version: 1\nentries: []\n`

### 3. Bootstrap Vectors (if missing)

- If `{improvementVectorsFile}` exists: load it, validate it has at least one named vector. Skip to step 4.
- If missing:
  - Interactive mode: explain that vectors define the opinionated north star, offer to seed from `{defaultVectorsFile}` plus a quick repo signal scan (README, docs/** including docs/mcp-documentation.md, package.json scripts, src/ top-level structure). User confirms before write.
  - Cron mode: auto-seed using `{defaultVectorsFile}` + quick scan. Record `bootstrapped_by: cron` in the vectors file frontmatter.
- Write `{improvementVectorsFile}` and inform user (or log).

### 4. Create Run Journal

- Generate `runId` (ULID) and `runSlug` (`{YYYYMMDD-HHMM}-init`)
- Create directory `{runsFolder}/{runSlug}/`
- Copy `{runJournalTemplate}` to `{runsFolder}/{runSlug}/run.md`
- Populate frontmatter: `runId`, `runSlug`, `startedAt`, `mode`, `cronMode`, `user_name`, empty `stepsCompleted: []`, `lastStep: ''`, `status: 'in_progress'`
- Append a `# Run Journal: {runId}` section with a "## Step 01: Init" subsection summarizing what was verified and any bootstrap decisions

### 5. Update Frontmatter and Append Step Summary

- Append to run-journal `stepsCompleted`: `step-01-init`
- Set `lastStep: 'step-01-init'`, `lastUpdated: <ISO 8601>`
- Append a markdown summary under `## Step 01: Init` listing: prior-run resolution, environment checks passed, vector bootstrap decision

### 6. Present MENU OPTIONS

Display:

```
Step 01 (Init) complete. Run journal: {runsFolder}/{runSlug}/run.md

Select an Option:
[C] Continue to Step 02 (Discovery)
[A] Advanced Elicitation (audit init decisions)
[X] Abort and mark run aborted
```

#### EXECUTION RULES:
- ALWAYS halt and wait for user input
- ONLY proceed to next step when user selects 'C'
- In `cronMode: true`: auto-select 'C'

#### Menu Handling Logic:
- IF C: load and read entire `{nextStepFile}`, then execute it
- IF A: Execute `{project-root}/.agents/skills/bmad-advanced-elicitation/SKILL.md`, then redisplay menu
- IF X: Set run-journal frontmatter `status: 'aborted'`, write final note, halt
- IF Any other: help user, then redisplay menu

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Prior in-progress run resolved (resumed, started fresh, or aborted)
- Environment verified (git, gh, ledger, output folders)
- Vectors file present (preexisting or bootstrapped with explicit decision)
- Run journal created and populated with Step 01 entry
- `stepsCompleted` updated

### ❌ SYSTEM FAILURE:
- Silently creating vectors without user consent in interactive mode
- Beginning discovery scanning in this step
- Skipping environment checks
- Writing to ledger or proposals folder in this step

**Master Rule:** Init sets up the run. It does not analyze, propose, or commit to GitHub. Cross those lines and you have failed.
