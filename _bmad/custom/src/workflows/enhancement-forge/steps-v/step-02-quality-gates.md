---
name: 'step-02-quality-gates'
description: 'Audit a prior run against the same quality gates step-06 enforces, plus post-hoc gates that need disk artifacts'

nextStepFile: './step-04-report.md'
antiPatternsFile: '../data/anti-patterns.md'
proposalTemplate: '../templates/proposal-template.md'
---

# Validate Step 2: Quality Gates Audit

## STEP GOAL:

Re-run the proposal quality gates (and additional post-hoc gates) against a completed run's proposal artifact, run journal, and ledger entry. Surface drift between what step-06 claimed and what's now on disk.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER mutate any artifact (read-only audit)
- 📖 CRITICAL: Read complete step file before action

### Step-Specific Rules:
- 🎯 Pattern 2 (deep analysis) per gate
- 🚫 FORBIDDEN to write report here (that's step-04)
- 💬 Cache findings in step-v session memory

## MANDATORY SEQUENCE

### 1. Load Targets

From step-01 cache: run journal path, proposal path, ledger entry.

### 2. Run Original Gates (mirror of step-06)

| Gate | Pass Condition |
|---|---|
| `hasRepoEvidence` | At least one `References` entry cites a repo path/commit |
| `hasAbstractionReasoning` | `Higher-Order Abstraction Notes` non-empty, mentions interface/intent/workflow |
| `hasTestableAcceptance` | Every AC bullet contains observable verb |
| `noOneToOneWrapper` | No 1:1 wrapper anti-pattern in body |
| `outOfScopeNonEmpty` | `Out-of-Scope` section lists at least one exclusion |

### 3. Run Post-Hoc Gates (require disk-state)

| Gate | Pass Condition |
|---|---|
| `proposalIntegrity` | Proposal artifact unchanged since `proposalDraft.approvedAt` (hash compare) OR re-sync recorded in run-journal Edit Notes |
| `ledgerConsistency` | Ledger entry's `vector`, `complexity`, `surfaceArea` match the run journal frontmatter |
| `issueLabelConsistency` | Live GH issue labels (via `gh issue view --json labels`) match `ledgerEntry.labelsApplied` (allowing additional `forge:status:*` lifecycle labels) |
| `evidenceStillValid` | Each repo path cited in `References` still exists in HEAD; each issue/PR cited still exists |
| `noLedgerOrphan` | Ledger entry exists for this run id; `proposalPath` resolves |

### 4. Anti-Pattern Re-Scan

Run the anti-patterns checklist from `{antiPatternsFile}` against the current proposal text. New drift may have emerged.

### 5. Cache Findings

Build a findings JSON for step-04:

```json
{
  "target": "run",
  "runSlug": "...",
  "originalGates": {"hasRepoEvidence": true, ...},
  "postHocGates": {"proposalIntegrity": false, ...},
  "antiPatternFlags": [],
  "summary": {"passed": 8, "failed": 1, "warnings": 1},
  "criticalFailures": [{"gate": "evidenceStillValid", "details": "src/old-file.ts cited in References no longer exists"}]
}
```

### 6. Present MENU OPTIONS

```
Quality gate audit complete. Passed: {pass_count}. Failed: {fail_count}.

[C] Continue to report (step-04)
[L] Also audit the ledger (step-03)
[X] Cancel
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}` with cached findings
- IF L: load step-03-ledger-audit, then come back to this menu
- IF X: halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- All 5 original gates re-evaluated
- All 5 post-hoc gates evaluated
- Anti-pattern re-scan completed
- Findings cached for report

### ❌ SYSTEM FAILURE:
- Mutating any artifact
- Skipping a gate
- Writing report here

**Master Rule:** Audit reads. Report writes.
