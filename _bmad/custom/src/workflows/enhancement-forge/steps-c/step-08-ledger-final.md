---
name: 'step-08-ledger-final'
description: 'Append the run as a new ledger entry, finalize run journal, print summary'

# No nextStepFile - this is the final step
runJournalFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/run.md'
proposalFile: '{project-root}/_bmad-output/enhancement-forge/proposals/{runSlug}-{ideaSlug}.md'
ledgerFile: '{project-root}/_bmad-output/enhancement-forge/ledger.yaml'
ledgerSchemaFile: '../data/ledger-schema.yaml'
---

# Step 8: Ledger Update + Completion (Final)

## STEP GOAL:

Append the run's outcome to the ledger as a new entry, finalize the run journal, and print a summary including next-run hints.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER mutate prior ledger entries (append-only)
- 📖 CRITICAL: Read complete step file before action
- 📋 YOU ARE A FACILITATOR

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** closing the loop

### Step-Specific Rules:
- 🎯 Schema-validate against `{ledgerSchemaFile}` before write
- 🚫 FORBIDDEN to update prior entries (corrections create new entries with `correctsId`)
- 🛡️ Atomic write: write to a temp file then rename to `{ledgerFile}` to avoid partial reads from concurrent observers

## EXECUTION PROTOCOLS:
- 🎯 Compose entry → validate → atomic append → finalize journal
- 💾 Run journal `status: complete`

## CONTEXT BOUNDARIES:
- Available: run journal frontmatter, proposal artifact, issue URL
- Focus: persistence and summary
- Limits: no further GH calls, no proposal edits
- Dependencies: step-07 issue created

## MANDATORY SEQUENCE

### 1. Compose Ledger Entry

Build entry per `{ledgerSchemaFile}`:

```yaml
- id: <ULID>
  proposalPath: <path relative to repo root>
  runId: <runId>
  generatedAt: <ISO 8601>
  vector: <runJournal.vectorSelection.vector>
  complexity: <from proposal frontmatter>
  surfaceArea: <from proposal frontmatter>
  abstractionScore: <runJournal.ideaSelection.abstractionScore>
  confidence: <runJournal.ideaSelection.confidence>
  issueUrl: <runJournal.issueCreation.issueUrl>
  issueNumber: <runJournal.issueCreation.issueNumber>
  labelsApplied: <runJournal.issueCreation.labelsApplied>
  decisionToImplement: null
  decisionAt: null
  implementationSuccess: null
  shippedAt: null
  shippedPr: null
  outcomeNotes: ''
  agentInvolvement: ['Scanner', 'VectorSelector', 'IdeaSelector', 'ProposalWriter', 'PM']
  correctsId: null
```

### 2. Schema Validate

Validate the entry against `{ledgerSchemaFile}` `entry_schema`:
- Required fields present
- Types correct (`abstractionScore` and `confidence` are floats 0..1)
- `issueUrl` is a valid GH URL

If invalid: halt with diagnostic, do NOT write.

### 3. Atomic Append

- Read `{ledgerFile}` (or initialize if header-only)
- Append the new entry under `entries:`
- Write to `{ledgerFile}.tmp`
- `mv {ledgerFile}.tmp {ledgerFile}` (atomic rename)

### 4. Finalize Run Journal

Update run journal frontmatter:
- `ledgerUpdate.ledgerEntryId`, `.appendedAt`
- `stepsCompleted += step-08-ledger-final`, `lastStep: step-08-ledger-final`
- `status: complete`

Append `## Step 08: Ledger Update + Completion` section with:
- Ledger entry ID
- Path to ledger file
- Final summary block

### 5. Print Run Summary

Display:

```
✅ Enhancement Forge run complete.

Vector:           {vector}
Idea:             {title}
Proposal:         {proposalFile}
Issue:            {issueUrl}
Ledger entry:     {ledgerEntryId}
Run journal:      {runJournalFile}

Next-run hints:
- Next active vectors (after cooldown): {computed_set}
- Pending decisions in ledger: {count_of_null_decisionToImplement}
- Suggest running with `--validate ledger` if pending decisions count exceeds 5
```

### 6. Halt

This is the final step. No `nextStepFile`. Workflow complete.

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Ledger entry composed, validated, and atomically appended
- Run journal marked `status: complete`
- Summary printed with actionable next-run hints

### ❌ SYSTEM FAILURE:
- Mutating prior ledger entries
- Non-atomic write (risk of partial-read corruption)
- Skipping schema validation
- Forgetting to update run journal status

**Master Rule:** The ledger is the learning loop. Treat its integrity like a database.
