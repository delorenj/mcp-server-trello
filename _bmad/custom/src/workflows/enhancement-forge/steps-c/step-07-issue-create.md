---
name: 'step-07-issue-create'
description: 'Render proposal into GH issue body, dry-run preview, apply labels, create issue, return URL'

nextStepFile: './step-08-ledger-final.md'
runJournalFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/run.md'
proposalFile: '{project-root}/_bmad-output/enhancement-forge/proposals/{runSlug}-{ideaSlug}.md'
pmAgentFile: '../data/sub-agents/pm.md'
labelConventionsFile: '../data/label-conventions.md'
---

# Step 7: GitHub Issue Creation

## STEP GOAL:

Render the approved proposal into a GitHub issue body, dry-run for preview, apply labels per convention, create the real issue via `gh` CLI (or GH MCP fallback), and return the issue URL.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER call `gh issue create` without a successful dry-run preview accepted by user (or cron-mode equivalent: gates clean)
- 📖 CRITICAL: Read complete step file before action
- 📋 YOU ARE A FACILITATOR

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** dispatching the PM sub-agent
- ✅ The PM renders + applies labels; you orchestrate the safety net

### Step-Specific Rules:
- 🎯 Prescriptive: this step has exact commands and schemas
- 🛡️ Dry-run first, real create second
- 🚫 FORBIDDEN to write the ledger here (step-08)
- 🚫 FORBIDDEN to modify the proposal artifact (it's frozen post-CHECKPOINT 3)
- ⚙️ TOOL FALLBACK: if `gh` unavailable, attempt GitHub MCP tools; if both fail, halt with remediation (do NOT silently skip the issue)

## EXECUTION PROTOCOLS:
- 🎯 Render → dry-run → user confirm → real create → capture URL
- 💾 Persist issue URL and labels to run journal frontmatter `issueCreation`
- 📖 Append `## Step 07: Issue Creation` summary

## CONTEXT BOUNDARIES:
- Available: approved proposal, label conventions, vector + complexity metadata
- Focus: prescriptive issue creation
- Limits: no proposal edits, no ledger writes
- Dependencies: step-06 proposal approved

## MANDATORY SEQUENCE

### 1. Invoke PM Sub-Agent for Body Rendering

Spawn an Agent with system prompt from `{pmAgentFile}` and inputs: full `{proposalFile}`, `{labelConventionsFile}`, run journal frontmatter (vector, complexity, surfaceArea, abstractionScore).

PM returns:

```json
{
  "title": "[forge] {short title}",
  "body": "<markdown for GH issue body, 8 sections minus tracking metadata>",
  "labels": ["enhancement", "forge:auto", "vector:ux-ergonomics", "complexity:m", "abstraction:high"]
}
```

### 2. Validate Title and Labels Against Conventions

- Title prefix `[forge]` present
- Labels match `{labelConventionsFile}` (vector, complexity, abstraction scoring map)
- Body length is sane (>500 chars, <60_000 chars)

### 3. Dry-Run Preview

Run:

```bash
gh issue create --dry-run --repo <owner>/<repo> --title "<title>" --body-file <(echo "<body>") --label "<labels-csv>"
```

Capture the rendered preview. If dry-run flag is unsupported in the installed `gh` version, simulate by formatting the title/body/labels in a preview block.

### 4. User Confirmation Gate (Interactive)

Display preview. User chooses:

```
[A] Approve and create the issue
[E] Edit body inline (PM regenerates with feedback)
[L] Edit labels
[X] Abort (no GH side-effect; proposal artifact remains)
```

Cron mode: auto-approve if step-06 gates passed cleanly; otherwise this step queues for review and halts.

### 5. Create the Real Issue

```bash
gh issue create --repo <owner>/<repo> --title "<title>" --body-file <(echo "<body>") --label "<labels-csv>"
```

Capture the returned URL and issue number. If the call fails, do NOT silently retry; surface the error and halt.

### 6. Verify Initial Tracking Label in Created Issue

Ensure `forge:status:proposed` is present in the labels used during issue creation (provided by PM output). Do not append it a second time post-create.

### 7. Persist and Append

Update run journal frontmatter:
- `issueCreation.issueUrl`, `.issueNumber`, `.labelsApplied`
- `stepsCompleted += step-07-issue-create`, `lastStep: step-07-issue-create`

Append `## Step 07: Issue Creation` body section with title, URL, labels, and rendering decisions.

### 8. Present MENU OPTIONS

```
Issue created: {issueUrl}

[C] Continue to Ledger Update (Step 08)
[X] Abort (rare; issue is now public, ledger will mark with caveat)
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF X: append `forge:status:abandoned` label to the issue, mark run aborted, halt
- Cron: auto-C

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Dry-run preview shown (interactive) or gates re-verified (cron)
- Issue created with title, body, labels matching conventions
- URL and number captured to run journal

### ❌ SYSTEM FAILURE:
- Skipping dry-run preview
- Modifying the proposal artifact
- Writing to ledger in this step
- Silently retrying on `gh` failure
- Auto-creating issues in cron mode without clean gates

**Master Rule:** The issue is the contract. Every label, every section, every preview matters.
