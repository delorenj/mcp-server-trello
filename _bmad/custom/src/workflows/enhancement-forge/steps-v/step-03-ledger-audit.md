---
name: 'step-03-ledger-audit'
description: 'Health and dedup-risk audit of the ledger across all entries'

nextStepFile: './step-04-report.md'
ledgerSchemaFile: '../data/ledger-schema.yaml'
ledgerFile: '{project-root}/_bmad-output/enhancement-forge/ledger.yaml'
proposalsFolder: '{project-root}/_bmad-output/enhancement-forge/proposals'
---

# Validate Step 3: Ledger Audit

## STEP GOAL:

Audit the ledger as a whole: schema compliance, dedup risk (semantic similarity across entries), pending decisions, and correlation analysis (which proposal characteristics correlate with shipped outcomes).

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER mutate the ledger (read-only audit)
- 📖 CRITICAL: Read complete step file before action

### Step-Specific Rules:
- 🎯 Pattern 3 (data ops): subprocess loads ledger and runs analysis; returns aggregates
- 🚫 FORBIDDEN to write any file here
- ⚙️ TOOL FALLBACK: dedup similarity uses lexical Jaccard if no embedding store available; flag this in report

## MANDATORY SEQUENCE

### 1. Load Ledger

Read full `{ledgerFile}`. Validate top-level structure: `ledger_version: 1`, `entries: [...]`.

### 2. Per-Entry Schema Compliance

For each entry, validate against `{ledgerSchemaFile}`. Collect:
- Schema-invalid entries (with reason)
- Entries with missing `proposalPath` files on disk (orphans)

### 3. Pending-Decision Census

Count entries where `decisionToImplement: null`. Surface oldest:

```json
{
  "pending_count": 7,
  "oldest_pending": [{"id": "...", "issueUrl": "...", "ageDays": 42}, ...]
}
```

### 4. Dedup Risk

For each pair of recent entries (last 20), compute similarity:
- Title similarity (lexical Jaccard or embedding cosine if available)
- Vector + idea slug overlap
- Surface-area overlap

Flag pairs with similarity > 0.6. These are dedup-risk hits the workflow should have caught.

### 5. Correlation Analysis

Aggregate across all entries with non-null `decisionToImplement` and `implementationSuccess`:

| Dimension | Acceptance Rate | Implementation Rate |
|---|---|---|
| By vector | UX/Ergonomics: 80% / 60% | Performance: 30% / 10% | ... |
| By complexity | XS: 95%/85% | M: 60%/40% | XL: 10%/0% |
| By abstraction level | high: 75%/55% | low: 40%/30% |

Highlight surprising correlations.

### 6. Cache Findings

Build a findings JSON:

```json
{
  "target": "ledger",
  "totalEntries": 0,
  "schemaInvalid": [],
  "orphans": [],
  "pending": {...},
  "dedupRiskPairs": [...],
  "correlations": {...},
  "summary": "..."
}
```

### 7. Present MENU OPTIONS

```
Ledger audit complete.

[C] Continue to report (step-04)
[X] Cancel
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF X: halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Schema validation across all entries
- Pending decisions counted with oldest surfaced
- Dedup-risk pairs flagged
- Correlation analysis computed for entries with both axes resolved

### ❌ SYSTEM FAILURE:
- Mutating the ledger
- Skipping schema check
- Missing orphan detection

**Master Rule:** The ledger is the learning loop's substrate. Auditing it is auditing the loop.
