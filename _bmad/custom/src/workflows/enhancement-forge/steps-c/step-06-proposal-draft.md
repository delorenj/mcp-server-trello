---
name: 'step-06-proposal-draft'
description: 'Render the structured proposal artifact, run quality gate audit, gate at CHECKPOINT 3'

nextStepFile: './step-07-issue-create.md'
runJournalFile: '{project-root}/_bmad-output/enhancement-forge/runs/{runSlug}/run.md'
proposalTemplate: '../templates/proposal-template.md'
proposalsFolder: '{project-root}/_bmad-output/enhancement-forge/proposals'
proposalFile: '{proposalsFolder}/{runSlug}-{ideaSlug}.md'
proposalWriterAgentFile: '../data/sub-agents/proposal-writer.md'
advancedElicitationTask: '{project-root}/.agents/skills/bmad-advanced-elicitation/SKILL.md'
antiPatternsFile: '../data/anti-patterns.md'
qualityGatesPattern: 'pattern-2'
maxRegens: 2
---

# Step 6: Proposal Drafting + Quality Audit (CHECKPOINT 3)

## STEP GOAL:

Render the structured proposal artifact (8 required sections), audit it against quality gates via subprocess, and gate at user CHECKPOINT 3 before any GitHub side-effect.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER skip the quality gate audit
- 📖 CRITICAL: Read complete step file before action
- 📋 YOU ARE A FACILITATOR

### Role Reinforcement:
- ✅ You are the **Enhancement Forge Steward** orchestrating the Proposal Writer + audit
- ✅ The Writer drafts; the audit subprocess validates; you assemble

### Step-Specific Rules:
- 🎯 Pattern 2 (deep analysis): subprocess audits the draft against quality gates and returns a gap list
- 🎯 CHECKPOINT 3: user must approve proposal before issue creation
- 🚫 FORBIDDEN to call `gh issue create` here (that's step-07)
- 🚫 FORBIDDEN to write the ledger entry here (that's step-08)
- ⚙️ TOOL/SUBPROCESS FALLBACK: if subprocess unavailable, run the audit checklist inline
- 🔒 Cron mode: auto-approve only if quality gates pass cleanly with zero gaps

## EXECUTION PROTOCOLS:
- 🎯 Writer subprocess → audit subprocess → user gate
- 💾 Persist proposal to `{proposalFile}`
- 📖 Append `## Step 06: Proposal Draft` to run journal with audit results

## CONTEXT BOUNDARIES:
- Available: idea selection, vector, discovery JSON, ideation file, proposal template, anti-patterns
- Focus: render and audit
- Limits: no GH calls, no ledger writes
- Dependencies: step-05 idea selected

## MANDATORY SEQUENCE

### 1. Invoke Proposal Writer Sub-Agent

Spawn an Agent with system prompt from `{proposalWriterAgentFile}` and inputs:
- Selected idea (full)
- Vector and its description
- Top 5 discovery findings cited as evidence
- `{proposalTemplate}` (must hit all 8 sections)
- `{antiPatternsFile}`

Writer renders a candidate proposal markdown. Generate `ideaSlug` from idea title (kebab-case). Write to `{proposalFile}`.

### 2. Run Quality Gate Audit (Subprocess, Pattern 2)

Launch a subprocess that loads `{proposalFile}` and audits each gate:

| Gate | Pass Condition |
|---|---|
| `hasRepoEvidence` | At least one `References` entry cites a repo path or commit |
| `hasAbstractionReasoning` | `Higher-Order Abstraction Notes` section is non-empty and mentions an interface, intent, or workflow pattern |
| `hasTestableAcceptance` | Every `Acceptance Criteria` bullet contains an observable verb (e.g. returns, equals, contains, fails when, completes within) |
| `noOneToOneWrapper` | Anti-pattern detector finds no "expose X endpoint as Y tool" 1:1 mapping without justification |
| `outOfScopeNonEmpty` | `Out-of-Scope` section explicitly lists at least one exclusion |

Subprocess returns:

```json
{
  "passed": false,
  "gates": {"hasRepoEvidence": true, "hasAbstractionReasoning": true, "hasTestableAcceptance": false, "noOneToOneWrapper": true, "outOfScopeNonEmpty": true},
  "gaps": [{"gate": "hasTestableAcceptance", "details": "AC #2 uses 'improve' without measurable observable"}]
}
```

### 3. Iterate Until Gates Pass or Max Regens

If `passed: false`, send gaps back to Proposal Writer for targeted revision. Re-audit. Repeat up to `{maxRegens}`. After max, escalate to user with full gap list (interactive) or queue for review (cron).

### 4. Run Advanced Elicitation Polish Pass

Once gates pass, run `{advancedElicitationTask}` for one final readability + framing critique. Apply suggested edits non-destructively; user can decline.

### 5. CHECKPOINT 3: User Approval (Interactive)

Display:

```
Proposal drafted: {title}
Path: {proposalFile}
Quality gates: ALL PASSED
Adv Elicit notes: {summary}

Preview:
{first 30 lines of proposal}
[...]

[A]ccept  [E]dit (open in editor)  [R]egenerate (back to Writer)  [B]ack to idea selection  [X] Abort
```

Cron mode: auto-approve if gates passed cleanly first try; otherwise halt+queue.

### 6. Persist + Frontmatter

Update run journal:
- `proposalDraft.proposalPath`, `.qualityGatesPassed: true`, `.approvedAt`
- `stepsCompleted += step-06-proposal-draft`, `lastStep: step-06-proposal-draft`

Append `## Step 06: Proposal Draft` to journal body with proposal path and audit JSON.

### 7. Present MENU OPTIONS

```
Proposal locked: {title}. Quality gates passed.

[C] Continue to Issue Creation (Step 07)
[A] Advanced Elicitation (additional polish)
[X] Abort (no GH side-effect yet)
```

#### Menu Handling Logic:
- IF C: load and execute `{nextStepFile}`
- IF A: re-run adv-elicit polish, redisplay
- IF X: mark aborted; proposal artifact persists on disk for forensics
- Cron: auto-C

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Proposal artifact written to disk with all 8 sections
- All 5 quality gates passed (or escalated correctly)
- User approved (or cron auto-approved per gate pass)
- Run journal updated

### ❌ SYSTEM FAILURE:
- Calling `gh issue create` here
- Writing to ledger here
- Bypassing quality gates
- Auto-approving in cron mode with gate failures

**Master Rule:** The proposal must earn the right to become a GH issue. Gates are non-negotiable.
