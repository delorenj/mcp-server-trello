---
name: 'step-01-load'
description: 'Load a target run for editing: identify by slug or path, validate state, present what is editable'

nextStepFile: './step-02-section-select.md'
runsFolder: '{project-root}/_bmad-output/enhancement-forge/runs'
proposalsFolder: '{project-root}/_bmad-output/enhancement-forge/proposals'
ledgerFile: '{project-root}/_bmad-output/enhancement-forge/ledger.yaml'
---

# Edit Step 1: Load Target Run

## STEP GOAL:

Identify and load a target forge run for editing, validate its state, and present a summary of what artifacts are available to edit.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER mutate any artifact in this step (load only)
- 📖 CRITICAL: Read complete step file before action
- 📋 YOU ARE A FACILITATOR

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** in edit mode
- ✅ You load and present; the user picks the section to edit in step-02

### Step-Specific Rules:
- 🎯 Locate the target run unambiguously
- 🚫 FORBIDDEN to write any file in this step
- 💬 If the run is incomplete (`status != complete`), warn the user; editing in-progress runs is allowed but flagged

## EXECUTION PROTOCOLS:
- 🎯 Load run journal, proposal artifact, and ledger entry (if exists)
- 💾 Cache absolute paths in step-e session memory for downstream steps
- 📖 Do not modify run journal `stepsCompleted` (edit mode is orthogonal to create flow)

## CONTEXT BOUNDARIES:
- Available: existing runs and proposals on disk
- Focus: identification and loading
- Limits: no edits
- Dependencies: at least one prior run must exist

## MANDATORY SEQUENCE

### 1. Resolve Target Run

Resolution priority:
1. If user provided a run slug or path on invocation: validate it exists; halt with help if not
2. Else list all runs in `{runsFolder}` sorted by `lastUpdated` desc, paginated:
   ```
   Recent runs:
    [1] {YYYYMMDD-HHMM}-init (e.g., 20260507-1432-init)   complete    issue#142
    [2] {YYYYMMDD-HHMM}-init (e.g., 20260506-2104-init)   complete    issue#138
    [3] {YYYYMMDD-HHMM}-init (e.g., 20260505-1100-init)   queued_for_review  -
   ...
   Pick a run by number, or paste a path:
   ```

### 2. Load Run Journal

Read the target run journal frontmatter and body. Extract:
- runId, runSlug, status, mode
- proposal path (if step-06 completed)
- issue URL (if step-07 completed)
- ledger entry id (if step-08 completed)

### 3. Locate Companion Artifacts

- **Proposal artifact:** look up `{proposalsFolder}/{runSlug}-{ideaSlug}.md`. If exists, mark as editable.
- **Ledger entry:** scan `{ledgerFile}` for entry with matching `runId`. If exists, mark as editable.
- **Vectors file:** always editable (project-root level), surfaced as a separate option.

### 4. Present Editable Summary

Display:

```
Run loaded: {runSlug}  (status: {status})

Available to edit:
  [P] Proposal artifact      → {proposalPath}        (last modified: {ts})
  [L] Ledger entry           → id={ledgerEntryId}    (vector: {vector})
  [V] Vectors file           → {vectorsPath}
  [J] Run journal (notes)    → {runJournalPath}
  [I] Issue (open in browser, no edits here)

Note: editing the proposal post-issue-creation triggers a re-sync to the GH issue body in step-04.
```

### 5. Present MENU OPTIONS

```
[C] Continue to section selection (step-02)
[X] Cancel
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}` with the resolved targets in step-e session memory
- IF X: halt without changes

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Target run identified
- All companion artifacts located (or marked absent)
- User shown the menu of editable surfaces

### ❌ SYSTEM FAILURE:
- Mutating any file in this step
- Routing to step-02 without resolved paths
- Silent failure when run path is invalid

**Master Rule:** Edit mode loads first, asks second, mutates third (in step-03).
