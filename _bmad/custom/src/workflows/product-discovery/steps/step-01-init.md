---
name: 'step-01-init'
description: 'Initialize run journal, preflight the board (.project.json + provider), recall hindsight'

nextStepFile: './step-02-discovery.md'
runJournalFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/run.md'
runJournalTemplate: '../templates/run-journal-template.md'
doctrineSkill: '{project-root}/.agents/skills/mcp-server-trello-product-doctrine/SKILL.md'
---

# Step 1: Initialize + Board Preflight

## STEP GOAL:

Create the run journal, confirm the ticket board actually exists and is reachable, and recall durable memory — so the pipeline never discovers a great idea it cannot file.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER proceed past preflight with no reachable board — a ticket-less run is a wasted run
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Discovery Steward**; this step is plumbing, not product thinking
- ⚙️ TOOL FALLBACK: if `momo-board.sh` is unreachable, note it and continue only if the operator confirms an alternate filing path

## MANDATORY SEQUENCE

### 1. Create Run Journal

- `runSlug` = `run-YYYYMMDD-HHmm`
- Copy `{runJournalTemplate}` → `{runJournalFile}`
- Fill `runId`, `runSlug`, `startedAt`, `user_name`, `runFocus` (from invocation, may be empty)

### 2. Board Preflight

1. Resolve the nearest ancestor `.project.json` (walk up from `{project-root}`).
2. **If absent** — momo has no board here and the pipeline cannot file. Present:

   ```
   No .project.json found — this repo is not a pjangler CommonProject, so there is
   no board and /momo cannot run here.

   [B] Bootstrap CommonProject identity (route to the 33god-projects skill, then resume)
   [X] Abort the run
   ```

   - IF B: invoke the `33god-projects` skill to provision `.project.json` + board, then re-run this preflight. Do NOT hand-roll a `.project.json`.
   - IF X: mark the run aborted, halt.
3. **If present** — read `ticket_provider.type` and `project_slug`.
4. Verify reachability: run `~/.claude/skills/momo/scripts/momo-board.sh list_issues` (add `--root <dir>` if the `.project.json` root differs from `{project-root}`). On failure, surface the error and halt with remediation — do NOT silently continue.
5. Record `boardPreflight.provider`, `.projectSlug`, `.verifiedAt` in the run-journal frontmatter.

### 3. Hindsight Recall

Run:

```bash
hindsight memory recall <projectSlug> "product discovery: killed ideas, demand signals, roadmap state" --budget mid
```

Record anything load-bearing (especially previously **killed ideas and why**) in the run journal under `## Step 01: Init`. Killed ideas are gate evidence for step-04.

### 4. Doctrine Freshness Note

From `{doctrineSkill}`, note its last VERIFIED date and any blocks it flags as overdue for re-verification. Carry this into step-02: stale doctrine numbers must be re-run, not quoted.

### 5. Update State and Present MENU OPTIONS

- `stepsCompleted += step-01-init`, `lastStep: step-01-init`

```
Step 01 (Init) complete. Board: {provider}/{projectSlug} reachable. Journal: {runJournalFile}

[C] Continue to Discovery (Step 02)
[X] Abort
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF X: mark aborted, halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Run journal created with preflight results
- Board provider verified reachable (or bootstrapped and then verified)
- Hindsight recalled; killed-idea list captured

### ❌ SYSTEM FAILURE:
- Proceeding without a reachable board
- Hand-rolling a `.project.json` instead of routing to `33god-projects`
- Skipping hindsight recall (killed ideas get relitigated)

**Master Rule:** No board, no run. File-ability is a precondition, not an afterthought.
