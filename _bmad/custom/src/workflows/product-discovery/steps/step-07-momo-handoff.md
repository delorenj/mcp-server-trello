---
name: 'step-07-momo-handoff'
description: 'Kick off the /momo lifecycle on the filed ticket with a complete handoff packet; end the pipeline at momo intake'

runJournalFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/run.md'
definitionFile: '{project-root}/_bmad-output/product-discovery/definitions/{runSlug}-{ideaSlug}.md'
momoSkill: '{user-home}/.claude/skills/momo/SKILL.md'
---

# Step 7: Momo Handoff — Kick Off the Lifecycle

## STEP GOAL:

Hand the filed ticket to **Momo** with everything its per-ticket pipeline needs, so the lifecycle (triage → refine → implement → Gate 1 → Gate 2 → adversarial review → close) starts from evidence, not archaeology.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🚷 The pipeline ENDS at momo intake — never follow momo into implementation in this session
- 🚫 NEVER edit code, src, or tests in this step (momo's prime directive applies to you too: orchestrate, don't implement)
- 📖 CRITICAL: Read complete step file before action

### Role Reinforcement:
- ✅ You are the **Discovery Steward** passing a baton; Momo is the PM orchestrator from here
- 🤝 Momo and Hermes share the board — the handoff must be attributable and recorded

## MANDATORY SEQUENCE

### 1. Assemble the Handoff Packet

Compose the packet momo receives:

```markdown
## Momo Handoff — {ticketId}

- **Ticket:** {ticketId} — {ticketUrl}
- **Definition:** {definitionFile} (frozen {approvedAt})
- **Origin:** product-discovery run {runSlug} — ideation, gate evaluation, and kill record in {runJournalFile}'s run folder
- **Gate record:** cleared all five gates + North Star (see evaluation.md); slot effect: {net}
- **AC rubric:** self-checked 4/4 (non-empty, testable, enumerated, FR-coverage) — triage should pass on first read
- **Residual BELIEVED claims:** {list the operator accepted at CHECKPOINT 1, or "none"}
- **Demand evidence:** {top signal(s) with markers}
- **Non-goals:** {from definition — scope armor}
```

Post the packet as a **comment on the ticket** (`momo-board.sh comment <id> "<packet>"` or provider equivalent) so Hermes and future sessions see it too.

### 2. Kick Off the Momo Lifecycle

Invoke the **`momo`** skill (`{momoSkill}`) with the operator's goal:

```
orchestrate {ticketId}
```

Momo runs its own preflight (`.project.json`, hindsight, board read, Hermes state, pillars) and then its per-ticket pipeline: **triage → refine (if needed) → implement (delegated) → Gate 1 spec → Gate 2 quality → adversarial review → close gate**.

Your involvement ends the moment momo accepts the ticket into its pipeline (or routes it to refinement — which is still a successful handoff, not a failure).

> **If invoked in a context where skills cannot be chained:** end the run by presenting the operator the exact activation line — `/momo orchestrate {ticketId}` — and the handoff packet location. That presentation IS the handoff.

### 3. Record the Decision Trail

Per momo's "everything is an event" norm, note in the journal that the consequential product decision (this idea, these gates, this ticket) is recorded and attributable. If Bloodbank emission is wired in this repo, emit the decision event; otherwise the run journal is the trail.

### 4. Retain the Run Summary

```bash
hindsight memory retain <projectSlug> "Product discovery run {runSlug}: shipped ticket {ticketId} '{title}' ({slot classification}, {net slot effect}); killed {N} ideas at gates; momo orchestrating." --context session-summary
```

### 5. Final State and Close

- `stepsCompleted += step-07-momo-handoff`, `lastStep: step-07-momo-handoff`
- `momoHandoff.packetPosted: true`, `.kickedOffAt`, `status: 'complete'`
- Append `## Step 07: Momo Handoff` with the packet, momo's intake outcome, and the retention ID

Present the run summary:

```
Run complete.
  Idea:      {title}
  Ticket:    {ticketId} — {ticketUrl}
  Lifecycle: momo orchestrating (triage → implement → gates → close)
  Corpses:   {N} killed ideas retained to hindsight
  Journal:   {runJournalFile}
```

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Handoff packet posted to the ticket (visible to momo AND Hermes)
- Momo invoked with `orchestrate {ticketId}` (or the activation line presented when chaining is impossible)
- Run journal complete; hindsight updated

### ❌ SYSTEM FAILURE:
- Drifting into implementation after handoff
- Handing off without the gate record and residual BELIEVED claims (momo would re-litigate blindly)
- Ending without recording the decision trail

**Master Rule:** You discover, you define, you file, you hand off. Momo builds.
