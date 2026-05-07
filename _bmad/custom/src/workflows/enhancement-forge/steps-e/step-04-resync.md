---
name: 'step-04-resync'
description: 'Re-render edited proposal into GH issue body via gh issue edit, or apply label updates if ledger fields changed'

# No nextStepFile - terminal in edit mode
pmAgentFile: '../data/sub-agents/pm.md'
labelConventionsFile: '../data/label-conventions.md'
---

# Edit Step 4: Re-Sync (Final in Edit Mode)

## STEP GOAL:

When edits affect downstream surfaces, re-sync them: re-render edited proposals into the GH issue body, or apply matching `forge:status:*` labels when ledger decision fields changed.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER call `gh issue edit` without a dry-run preview accepted by user
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** keeping the GH surface consistent with the source-of-truth ledger and proposals

### Step-Specific Rules:
- 🎯 Two re-sync modes: body re-render (proposal edit) and label sync (ledger decision change); each handled separately
- 🚫 FORBIDDEN to silently mutate the GH issue
- ⚙️ TOOL FALLBACK: `gh` unavailable → GitHub MCP; both unavailable → halt with remediation

## MANDATORY SEQUENCE

### 1. Inspect Re-Sync Flags

From step-03 session memory:
- `needsResync: true` → proposal body re-render
- `needsLabelSync: true` → ledger-decision label sync

If neither: print "no re-sync needed" and halt.

### 2. Body Re-Render Path (if needsResync)

a. Re-invoke PM sub-agent (`{pmAgentFile}`) with the edited proposal as input. Render fresh title + body + labels.

b. If title or labels changed materially, surface that to the user explicitly: "Re-render produced a different title/label set. Apply?"

c. Dry-run via `gh issue view <issueNumber> --json body,title,labels` to compare current GH state with proposed.

d. User confirms:
```
Apply re-render?
[A] Yes, replace body (and title/labels if changed)
[B] Body only, keep title and labels
[X] Cancel
```

e. Apply via `gh issue edit <issueNumber> --body-file <(echo "<body>")` (and `--title`, `--add-label`, `--remove-label` as needed).

f. Append a comment to the GH issue:
```
_enhancement-forge: re-rendered after edit at {ISO 8601}. Source proposal: {proposalPath}._
```

### 3. Label Sync Path (if needsLabelSync)

a. Read the updated ledger entry. Determine target status label:
   - `decisionToImplement: true` → add `forge:status:accepted`, remove `forge:status:proposed`
   - `decisionToImplement: false` → add `forge:status:rejected`, remove `forge:status:proposed`
   - `implementationSuccess: true` → add `forge:status:shipped` (and link `shippedPr` in a comment)

b. User confirms label change preview.

c. Apply via `gh issue edit <issueNumber> --add-label X --remove-label Y`.

### 4. Update Run Journal

Append to run journal under `## Edit Notes`:

```markdown
### Re-Sync {ISO 8601}
- Mode: {body|labels|both}
- Issue: {issueUrl}
- Diff applied: {brief summary}
```

### 5. Print Summary

```
✅ Re-sync complete.

Issue: {issueUrl}
Updates applied: {summary}
Run journal: {runJournalPath}
```

### 6. Halt

This is the terminal step in edit mode. No `nextStepFile`.

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Re-sync flags inspected; correct path taken (or no-op if neither)
- Dry-run preview shown before any GH mutation
- User confirmed each change
- Run journal Edit Notes updated with re-sync record

### ❌ SYSTEM FAILURE:
- Mutating GH issue without dry-run preview
- Skipping ledger or run-journal updates
- Applying labels not in the conventions file

**Master Rule:** Edits propagate explicitly. No silent drift between disk truth and GitHub.
