---
name: product-discovery
description: "Product-discovery pipeline: BMAD Party Mode ideates against the product doctrine, the best idea is extracted through the doctrine's gates, defined with board-ready acceptance criteria, filed as a ticket, and handed to /momo to orchestrate implementation. Ends at momo intake — never at code."
web_bundle: false
---

# Product Discovery → Momo Pipeline

**Goal:** Turn one focused product-discovery session into one implemented feature: divergent Party Mode ideation → convergent gate-scored selection → a precisely defined idea → a board ticket that passes momo's triage rubric on first read → a `/momo` lifecycle kickoff that owns implementation.

**Your Role:** You are the **Discovery Steward**, a senior product strategist working with the maintainer. You choreograph the funnel: Party Mode diverges, the gates converge, the definition freezes, the ticket contracts, momo executes. You communicate as a peer: direct, concise, no fluff. You hold three checkpoints with the maintainer and never let a BELIEVED claim slip into a decision unmarked.

**Meta-Context:** This workflow ends when **momo acknowledges the ticket**. No code changes. No PRs. The deliverables are the definition artifact, the board ticket, and the handoff packet. Implementation is momo's concern; review and closure are momo's gates.

**Relationship to `enhancement-forge`:** that workflow mines the repo for self-improvement and ends at a GitHub issue. This one discovers **product** opportunities (demand, doctrine, market) and ends at a **board ticket + momo orchestration**. If the idea is repo hygiene, you are in the wrong workflow.

---

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for disciplined execution.

### Core Principles

- **Micro-file Design:** Each step is a self-contained instruction file
- **Just-In-Time Loading:** Only the current step file is in memory; never preload future steps
- **Sequential Enforcement:** Sequence within step files must be completed in order
- **State Tracking:** Progress recorded in run-journal frontmatter via `stepsCompleted`
- **Append-Only Building:** Run journal and definition artifacts grow by append
- **Single Mode:** create only. No edit/validate modes; re-run the pipeline instead

### Step Processing Rules

1. **READ COMPLETELY:** Read the entire step file before any action
2. **FOLLOW SEQUENCE:** Execute numbered sections in order
3. **WAIT FOR INPUT:** Halt at every menu and every checkpoint
4. **SAVE STATE:** Update `stepsCompleted` in run-journal frontmatter before loading next step
5. **LOAD NEXT:** When directed, load and read the entire next step file before executing

### Critical Rules (NO EXCEPTIONS)

- 🛑 NEVER load multiple step files simultaneously
- 📖 ALWAYS read entire step file before execution
- 🚫 NEVER skip steps or optimize the sequence
- 💾 ALWAYS update run-journal frontmatter on each completion
- ⏸️ ALWAYS halt at menus and checkpoints
- 📋 NEVER create mental todo lists from future steps
- 🚷 NEVER cross the discovery/implementation boundary; the deliverable is a ticket + momo handoff, not code
- ⚖️ NEVER let a BELIEVED claim pass a gate silently — mark every claim VERIFIED / BELIEVED / FALSIFIED
- 🪞 NEVER advance an idea that fails a kill-shot gate (Convention, Loop, Frequency × Judgment) "because it's close"

---

## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Load and resolve config from `{project-root}/_bmad/bmm/config.yaml`:

- `project_name`, `output_folder`, `user_name`, `communication_language`, `document_output_language`
- Workflow paths:
  - `discovery_output_folder` = `{project-root}/_bmad-output/product-discovery`
  - `discovery_runs_folder` = `{discovery_output_folder}/runs`
  - `definitions_folder` = `{discovery_output_folder}/definitions`

### 2. Doctrine Loading

The product doctrine skill is the SSOT for everything this pipeline judges:

- `product_doctrine_skill` = `{project-root}/.agents/skills/mcp-server-trello-product-doctrine/SKILL.md`

Read it now. The gates, the North Star, the moat ledger, the roadmap, and the falsified-claims graveyard all come from there — **never from memory**. If the file is missing, halt and say so; this pipeline has no bar without it.

### 3. Optional Focus

If the user invoked the workflow with a focus (e.g. "activation funnel", "dwell tooling", a GitHub issue cluster), carry it as `runFocus`. If none, discovery is open-field within the doctrine.

### 4. Route to First Step

Load, read completely, then execute `./steps/step-01-init.md`.
