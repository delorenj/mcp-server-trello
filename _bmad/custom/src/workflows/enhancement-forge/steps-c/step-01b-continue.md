---
name: 'step-01b-continue'
description: 'Resume a forge run from prior in-progress state by reading stepsCompleted and routing to the correct next step'

workflowFile: '../workflow.md'
runsFolder: '{project-root}/_bmad-output/enhancement-forge/runs'
nextStepOptions:
  step-02: './step-02-discovery.md'
  step-03: './step-03-vector-select.md'
  step-04: './step-04-party-mode.md'
  step-05: './step-05-idea-select.md'
  step-06: './step-06-proposal-draft.md'
  step-07: './step-07-issue-create.md'
  step-08: './step-08-ledger-final.md'
---

# Step 1b: Continue Workflow

## STEP GOAL:

Resume a forge run from where it was left off by reading `stepsCompleted` from the target run journal and routing to the correct next step.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER generate content without user input (except in `cronMode`)
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step, read entire target file before executing
- 📋 YOU ARE A FACILITATOR

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward**, picking up a paused run
- ✅ Be brief; the user already knows what they were doing

### Step-Specific Rules:
- 🎯 Focus only on resuming, not redoing prior work
- 🚫 FORBIDDEN to re-run completed steps
- 🚫 FORBIDDEN to start a fresh run here (that's `step-01-init`)
- 💬 Confirm the resume target with the user in interactive mode

## EXECUTION PROTOCOLS:
- 🎯 Locate the target run journal
- 💾 Do not write to the journal until the resumed step writes its own state
- 📖 Use `nextStepOptions` mapping to dispatch

## CONTEXT BOUNDARIES:
- Prior run exists in `{runsFolder}` with status `in_progress`
- Run journal contains `stepsCompleted`, `lastStep`, and partial output
- Dependencies: a valid prior run journal

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 1. Identify Target Run

- If invoked with a run slug or path: use it
- If not: list `in_progress` runs from `{runsFolder}` sorted by `lastUpdated` descending; user picks one (or in cron mode, auto-pick the most recent if started within 24h)

### 2. Load Run Journal

- Read the run journal file's frontmatter
- Extract: `runId`, `runSlug`, `stepsCompleted`, `lastStep`, `mode`, `cronMode`, `status`
- Halt with explanation if `status != in_progress`

### 3. Determine Next Step

Use the following mapping based on `lastStep`:

| lastStep | Next |
|---|---|
| `step-01-init` | `step-02` |
| `step-02-discovery` | `step-03` |
| `step-03-vector-select` | `step-04` |
| `step-04-party-mode` | `step-05` |
| `step-05-idea-select` | `step-06` |
| `step-06-proposal-draft` | `step-07` |
| `step-07-issue-create` | `step-08` |
| `step-08-ledger-final` | run already complete; halt with summary |

If `lastStep` is missing or unrecognized: halt with explanation.

### 4. Welcome and Confirm

Interactive mode, display:

```
Resuming run: {runSlug}
Last completed: {lastStep}
Next step: {nextStepKey} → {nextStepFile}

Continue? [Y]es / [N]o (abort)
```

Cron mode: skip confirmation, proceed.

### 5. Dispatch

- IF Y or cron: load `{nextStepOptions[nextStepKey]}`, read entire file, then execute
- IF N: do not modify run journal; halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Correct run identified and loaded
- Next step computed unambiguously from `lastStep`
- User confirmed (or cron auto-confirmed)
- Control transferred to the correct next step file

### ❌ SYSTEM FAILURE:
- Re-executing a step already in `stepsCompleted`
- Starting a fresh run here
- Modifying run journal before the resumed step runs
- Routing to a step inconsistent with `lastStep`

**Master Rule:** Continuation is a router, not a worker. Read state, dispatch, exit.
