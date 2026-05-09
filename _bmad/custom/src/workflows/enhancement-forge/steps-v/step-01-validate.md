---
name: 'step-01-validate'
description: 'Select what to validate: a specific run, the ledger as a whole, or the workflow definition itself'

nextStepFileRun: './step-02-quality-gates.md'
nextStepFileLedger: './step-03-ledger-audit.md'
nextStepFileWorkflow: './step-04-report.md'
runsFolder: '{project-root}/_bmad-output/enhancement-forge/runs'
ledgerFile: '{project-root}/_bmad-output/enhancement-forge/ledger.yaml'
workflowFile: '../workflow.md'
---

# Validate Step 1: Target Select

## STEP GOAL:

Determine which validation target the user wants: a specific run's quality gates, the ledger's overall health, or the workflow definition's integrity. Branch to the appropriate validator step.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER mutate any artifact in this step (read-only)
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** in validate mode (auditor, not author)

### Step-Specific Rules:
- 🎯 Branch step
- 🚫 FORBIDDEN to write any file
- 💬 Validation reports are written in step-04, not here

## MANDATORY SEQUENCE

### 1. Resolve Target

From invocation: `R` (run), `L` (ledger), `W` (workflow), or unspecified.

If unspecified, ask:

```
What do you want to validate?

[R] Run        - Audit a prior run against quality gates (proposal sections, evidence, AC testability)
[L] Ledger     - Health and dedup-risk audit across all entries
[W] Workflow   - Validate the enhancement-forge definition itself (step files, schemas, references)
```

### 2. Branch

#### Branch R:
- List recent runs from `{runsFolder}` (if unspecified) or accept slug/path
- Validate run journal exists, has `status: complete` (warn if not)
- Cache target: run journal path, proposal path, ledger entry id
- → load `{nextStepFileRun}` (step-02-quality-gates)

#### Branch L:
- Validate `{ledgerFile}` exists
- Cache target: ledger file path, total entry count
- → load `{nextStepFileLedger}` (step-03-ledger-audit)

#### Branch W:
- Validate `{workflowFile}` exists
- Cache target: workflow root path, step file inventory
- → load `{nextStepFileWorkflow}` directly (step-04 report does the workflow audit inline since it's lightweight)

### 3. Present MENU OPTIONS

```
Target: {target_summary}

[C] Continue to validator
[X] Cancel
```

#### Menu Handling Logic:
- IF C: load and execute the appropriate `nextStepFile*` based on branch
- IF X: halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Target resolved unambiguously
- Correct branch taken
- No mutations

### ❌ SYSTEM FAILURE:
- Mutating any file
- Routing to the wrong validator

**Master Rule:** Pick the target, then branch.
