# Ticket / Definition Template

Used by step-05-idea-define. Every section is mandatory. The acceptance criteria must pass momo's triage rubric: **non-empty, testable, enumerated, FR-coverage**.

---

```markdown
---
title: '{imperative short title}'
ideaSlug: '{kebab-slug}'
originRun: '{runSlug}'
slotClassification: 'tool | param | default-flip | response-shape'
netSlotEffect: '+1 | flat | -1'
retires: '{what it retires, or "addition-only — argument below"}'
approvedAt: '{CHECKPOINT 2 timestamp}'
---

# {Title}

## Problem
{What is broken or missing, for whom, and why it matters now. One short paragraph.}

## Demand Evidence
{Behavioral signals only, with markers. e.g. "VERIFIED: issue #72 open since …, requested 3× in PRs #18/#53/#73". No fabricated users.}

## Proposed Change
{Slot classification, the concrete change, and what it retires or why addition-only is justified.}

## Gate Record
{One line per gate from evaluation.md — inherited, not re-litigated.}
- Gate 1 (Convention): …
- Gate 2 (Loop): …
- Gate 3 (Frequency × judgment): …
- Gate 4 (Slot ledger): …
- Gate 5 (Find-and-replace): …
- North Star: …

## Functional Requirements
- FR1: …
- FR2: …

## Acceptance Criteria
- AC1: {testable statement covering FR1 — a stranger can pass/fail it from the diff and a run}
- AC2: {covers FR1/FR2 — include the standing-test obligation where relevant, e.g. "when {assumption} is false, returns null + named reason rather than a plausible value"}
- AC3: …

## Non-Goals
- {What this ticket explicitly does not do — scope armor}

## Verification Hints
- {Commands/tests the reviewer can run, e.g. `npm run typecheck`, a specific vitest file, a stdio smoke command}
```

---

## Rubric Self-Check (step-05 runs this before CHECKPOINT 2)

- [ ] **Non-empty** — every AC has observable content
- [ ] **Testable** — every AC has an executable pass/fail
- [ ] **Enumerated** — ACs numbered, no prose blobs
- [ ] **FR-coverage** — every FR covered by ≥1 AC (note the mapping)
