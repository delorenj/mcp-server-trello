---
name: 'step-02-section-select'
description: 'User picks which artifact and section to edit; the workflow loads the targeted file and surfaces edit affordances'

nextStepFile: './step-03-edit.md'
proposalsFolder: '{project-root}/_bmad-output/enhancement-forge/proposals'
ledgerFile: '{project-root}/_bmad-output/enhancement-forge/ledger.yaml'
vectorsFile: '{project-root}/_bmad-output/enhancement-forge/improvement-vectors.md'
---

# Edit Step 2: Section Select

## STEP GOAL:

Receive the user's edit-target choice (artifact + section), load the targeted file region, and prepare context for step-03 to perform the actual edit.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER mutate files in this step
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** assisting targeted edits

### Step-Specific Rules:
- 🎯 Branch step: user picks which artifact path to take
- 🚫 FORBIDDEN to combine multiple section edits into one transaction (one section per edit cycle)
- 💬 Surface guardrails: editing the proposal post-issue triggers re-sync (warn)

## EXECUTION PROTOCOLS:
- 🎯 Load only the targeted artifact and read the section index
- 💾 Cache target metadata in step-e session memory

## MANDATORY SEQUENCE

### 1. Receive Selection from step-01

User chose one of: `[P]` proposal, `[L]` ledger entry, `[V]` vectors file, `[J]` run journal.

### 2. Branch on Selection

#### Branch P (Proposal):
- Load proposal markdown
- List the 8 sections (Context, Problem, Proposed Solution, Higher-Order Abstraction Notes, Acceptance Criteria, Out-of-Scope, References, Tracking Metadata) plus frontmatter
- User picks one section to edit
- Warn: "Editing this post-issue-creation will trigger a GH issue body re-sync in step-04. Continue?"

#### Branch L (Ledger Entry):
- Load entry by id from `{ledgerFile}`
- List fields safe to edit: `outcomeNotes`, `decisionToImplement`, `decisionAt`, `implementationSuccess`, `shippedAt`, `shippedPr`
- DO NOT permit edits to: `id`, `runId`, `proposalPath`, `vector`, `generatedAt`, `issueUrl`, `issueNumber` (immutable; corrections require a new entry with `correctsId`)

#### Branch V (Vectors File):
- Load `{vectorsFile}`
- List vectors and their fields (weight, cooldown_runs, description, examples)
- User picks vector and field

#### Branch J (Run Journal):
- Free-form notes section append; user can add a "## Edit Notes" subsection
- All other journal content is read-only (frontmatter, prior step summaries)

### 3. Load Targeted Region

Read the chosen file region into edit context:
- For markdown sections: load section content + 5 lines of surrounding context
- For YAML fields: load full entry/object + schema reference

### 4. Present MENU OPTIONS

```
Target locked:
  Artifact: {artifactType}
  Section/Field: {section}
  File: {path}

[C] Continue to edit (step-03)
[B] Back to artifact selection (step-01)
[X] Cancel
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}` with target in session memory
- IF B: re-execute `step-01-load.md` (allow user to repick)
- IF X: halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Single artifact + section locked
- Region loaded into edit context
- Re-sync warning surfaced if applicable

### ❌ SYSTEM FAILURE:
- Mutating files
- Locking multiple sections simultaneously
- Permitting edits to immutable ledger fields

**Master Rule:** One artifact, one section, one edit cycle.
