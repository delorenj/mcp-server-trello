---
name: 'step-03-edit'
description: 'Perform the targeted edit collaboratively, validate against schemas, persist changes'

nextStepFile: './step-04-resync.md'
ledgerSchemaFile: '../data/ledger-schema.yaml'
proposalTemplate: '../templates/proposal-template.md'
---

# Edit Step 3: Edit

## STEP GOAL:

Perform the targeted edit collaboratively with the user, validate the result against the relevant schema (proposal template, ledger schema, vectors structure), and persist atomically.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER write a partial or unvalidated change
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** facilitating an edit
- ✅ The user drives the change; you validate and persist

### Step-Specific Rules:
- 🎯 Validate before write
- 🛡️ Atomic write: temp file + rename
- 🚫 FORBIDDEN to modify untargeted sections
- 🚫 FORBIDDEN to skip schema validation

## EXECUTION PROTOCOLS:
- 🎯 Diff the proposed change; user approves diff before write
- 💾 Persist via temp + rename
- 📖 Append an "## Edit Notes" entry to the run journal recording: target, what changed, when, why

## MANDATORY SEQUENCE

### 1. Display Current Content

Show the loaded section/field exactly as it appears on disk.

### 2. Collect the Edit

Two modes:

**Inline mode:** user dictates the change; you draft the replacement; user approves or iterates.

**Editor mode:** open the file in `$EDITOR` at the right line range; user edits; on save, read back the change.

### 3. Validate

| Target | Validation |
|---|---|
| Proposal section | All 8 sections still present and non-empty; AC observable verbs unchanged or improved |
| Proposal frontmatter | YAML parses; required fields preserved |
| Ledger entry field | Field is in the editable allowlist; type matches schema; `decisionAt` and `shippedAt` are valid ISO 8601 if set |
| Vectors file | Frontmatter YAML parses; vector bullets still include required fields (weight, cooldown_runs, description); referenced labels still valid |
| Run journal notes | Markdown well-formed; existing frontmatter and step summaries untouched |

If validation fails: surface the error, do NOT write, return to step 2 for correction.

### 4. Diff Preview

Show a unified diff of the file. User confirms:

```
[A] Apply
[E] Re-edit
[X] Cancel (no write)
```

### 5. Persist Atomically

- Write to `{target}.tmp`
- `mv {target}.tmp {target}`

### 6. Append Edit Note to Run Journal

Append under `## Edit Notes` section in the run journal:

```markdown
### {ISO 8601 timestamp}
- Target: {file}#{section}
- Change summary: {one line}
- Editor: {user_name}
- Validation: passed
```

### 7. Determine Re-Sync Need

If the edited artifact is the proposal AND the run has `issueCreation.issueUrl` set, re-sync is needed. Set step-e session flag `needsResync: true`.

If the edited artifact is the ledger entry AND `decisionToImplement` or `implementationSuccess` changed, set flag `needsLabelSync: true` (apply matching `forge:status:*` label on the issue).

Otherwise, no re-sync needed.

### 8. Present MENU OPTIONS

```
Edit applied: {target}#{section}

[C] Continue to re-sync (step-04)  [auto-selected if needsResync or needsLabelSync]
[D] Done (no re-sync needed)
[A] Another edit (back to step-01)
```

#### Menu Handling Logic:
- IF C OR auto: load and execute `{nextStepFile}`
- IF D: halt with summary
- IF A: re-execute `step-01-load.md`

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Edit validated against schema
- Diff approved by user
- Atomic write succeeded
- Run journal Edit Notes appended

### ❌ SYSTEM FAILURE:
- Writing without validation
- Non-atomic write
- Modifying untargeted sections
- Skipping run-journal note

**Master Rule:** Validate, preview, persist, log. In that order.
