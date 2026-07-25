---
name: 'step-05-idea-define'
description: 'Freeze the winning idea into a precise definition with board-ready acceptance criteria that pass momo triage on first read'

nextStepFile: './step-06-ticket-create.md'
runJournalFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/run.md'
evaluationFile: '{project-root}/_bmad-output/product-discovery/runs/{runSlug}/evaluation.md'
definitionFile: '{project-root}/_bmad-output/product-discovery/definitions/{runSlug}-{ideaSlug}.md'
ticketTemplateFile: '../data/ticket-template.md'
---

# Step 5: Define the Idea

## STEP GOAL:

Turn the winning idea into a frozen definition artifact whose acceptance criteria pass momo's 4-criterion triage rubric (**non-empty, testable, enumerated, FR-coverage**) on first read — because a ticket that bounces at triage is pipeline waste.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER widen scope during definition — the gates scored *this* idea, not its bigger cousin
- 📖 CRITICAL: Read complete step file before action
- 🚫 The definition freezes at CHECKPOINT 2; later steps never edit it

### Role Reinforcement:
- ✅ You are the **Discovery Steward** writing a contract for momo and its implementer subagent
- 🎯 Prescriptive: use `{ticketTemplateFile}`; every section is mandatory

## MANDATORY SEQUENCE

### 1. Draft the Definition

Load `{ticketTemplateFile}` and `{evaluationFile}`. Write `{definitionFile}` containing, at minimum:

- **Problem + demand evidence** — the behavioral signal(s) from discovery, with markers. No fabricated users.
- **Proposed change** — slot classification (tool/param/default-flip/response-shape), what it retires, net slot effect.
- **Gate record** — one line per gate from the evaluation (inherited, not re-litigated).
- **Functional requirements** — enumerated FR1…FRn; each maps to ≥1 acceptance criterion.
- **Acceptance criteria** — enumerated AC1…ACn; each is a *testable* statement a reviewer can verify from the diff and a run, not a vibe. Cover every FR (FR-coverage). Include the doctrine's standing-test obligations where they apply (e.g. "when its assumption is false, returns null + named reason, not a plausible value").
- **Non-goals** — what this ticket explicitly does not do (scope armor for the implementer and reviewer).
- **Verification hints** — the commands/tests a reviewer can run (momos Gate 1 reviewer distrusts reports and reads the diff; make their job easy).

### 2. Self-Check Against the Triage Rubric

Before showing the operator, score your own ACs:

- **Non-empty:** every AC has observable content
- **Testable:** each AC has a pass/fail a stranger could execute
- **Enumerated:** ACs are numbered, no prose blobs
- **FR-coverage:** every FR is covered by ≥1 AC

Any fail → fix now. This rubric is momo's triage gate; passing it here is the difference between `ready` and a refinement loop.

### 3. CHECKPOINT 2 — Operator Approves the Definition

Present the full definition and halt:

```
Definition drafted: {definitionFile}
Triage self-check: 4/4 rubric criteria pass

[A] Approve and freeze — continue to Ticket Creation (Step 06)
[E] Edit (state what to change; steward revises and re-presents)
[X] Abort (evaluation and ideation artifacts remain)
```

#### Menu Handling Logic:
- IF A: freeze, record `definition` in frontmatter, load and execute `{nextStepFile}`
- IF E: revise, re-run the rubric self-check, re-present
- IF X: mark aborted, halt

### 4. Update State

- `stepsCompleted += step-05-idea-define`, `lastStep: step-05-idea-define`
- `definition.path`, `.ideaSlug`, `.acCount`, `.rubricPassed`, `.approvedAt`

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Definition artifact written with enumerated FRs and ACs
- 4/4 triage rubric self-check passes before the operator ever sees it
- Frozen only on explicit operator approval

### ❌ SYSTEM FAILURE:
- Scope creep past the gate-scored idea
- Untestable ACs ("works well", "handles errors gracefully")
- Editing the definition after freeze

**Master Rule:** The ticket is a contract. Write it so the pickiest reviewer you know passes it at triage.
