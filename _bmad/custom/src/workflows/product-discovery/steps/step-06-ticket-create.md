---
name: 'step-06-ticket-create'
description: 'File the frozen definition as a board ticket via the project-lifecycle skill, dry-run preview first, checkpoint before real create'

nextStepFile: './step-07-momo-handoff.md'
runJournalFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/run.md'
definitionFile: '{project-root}/_bmad-output/product-discovery/definitions/{runSlug}-{ideaSlug}.md'
projectLifecycleSkill: '{user-home}/code/skillex/skill-sets/global/project-lifecycle/SKILL.md'
---

# Step 6: Ticket Creation

## STEP GOAL:

File the frozen definition as a real ticket on the board momo reads — dry-run preview first, operator checkpoint, then real create — and capture the ticket ID.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER create the ticket without a preview the operator has seen (interactive) 
- 🚫 FORBIDDEN to modify the definition artifact — it froze at CHECKPOINT 2; the ticket *renders* it
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Discovery Steward**; filing is delegated to the `project-lifecycle` skill, which owns Plane/board CRUD conventions (momo's own routing table defers rich CRUD to it)
- ⚙️ TOOL FALLBACK: if `project-lifecycle` cannot create on this provider (e.g. a `trello`-typed board it doesn't cover), create through the provider-native path the `.project.json` implies (for Trello: the Trello API with `TRELLO_API_KEY`/`TRELLO_TOKEN`; this repo's own MCP server is fair dogfood). Record the fallback path in the journal. If no path works, halt with remediation — never silently skip the ticket.

## MANDATORY SEQUENCE

### 1. Render the Ticket

From `{definitionFile}` produce the ticket payload:
- **Title:** imperative, short, prefixed per board convention (check existing tickets via `momo-board.sh list_issues` for the house style)
- **Body:** the definition's sections, trimmed to what an implementer + reviewer need on the ticket itself; link/attach the full definition path
- **Metadata:** state/column per board convention (new scoped work lands wherever momo's triage pulls from — typically the inbox/triage lane, NOT straight to `started`)

### 2. Dry-Run Preview

Render the exact title + body + target lane in a preview block. No side effects.

### 3. CHECKPOINT 3 — Operator Approves Filing

```
Ticket preview:
  Title: {title}
  Lane:  {lane}
  Body:  {first ~30 lines}…

[A] Approve and file the ticket
[E] Edit title/body rendering (definition artifact stays frozen)
[X] Abort (no board side-effect)
```

#### Menu Handling Logic:
- IF A: proceed to real create
- IF E: adjust rendering, re-preview
- IF X: mark aborted, halt

### 4. Create the Ticket

Invoke the `project-lifecycle` skill (or the recorded fallback) to create the ticket. Capture the **ticket ID and URL**. On failure, surface the error and halt — do NOT silently retry.

### 5. Verify Filing

Read the ticket back (`momo-board.sh get_issue <id>` or provider equivalent) and confirm the body landed intact. Record the verification.

### 6. Update State and Append

- `stepsCompleted += step-06-ticket-create`, `lastStep: step-06-ticket-create`
- `ticketCreation.ticketId`, `.ticketUrl`, `.lane`, `.filedAt`
- Append `## Step 06: Ticket Creation` with title, ID, URL, and any fallback path used

### 7. Present MENU OPTIONS

```
Ticket filed: {ticketId} — {ticketUrl}

[C] Continue to Momo Handoff (Step 07)
[X] Abort (ticket exists; handoff skipped — momo will still see it on the board)
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF X: mark run `complete_no_handoff`, halt

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Preview shown and approved before any side effect
- Ticket created, read back, and body verified
- ID + URL captured to run journal

### ❌ SYSTEM FAILURE:
- Creating without preview
- Editing the frozen definition to "fix" the ticket
- Silent retry or silent skip on create failure

**Master Rule:** The ticket is the contract momo executes. Preview it like it costs money — it costs trust.
