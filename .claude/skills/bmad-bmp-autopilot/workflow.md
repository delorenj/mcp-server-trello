---
name: bmad-bmp-autopilot
description: 'Hand a target BMAD workflow to Otto for unattended execution.'
main_config: '{project-root}/_bmad/bmp/config.yaml'
---

# Autopilot Workflow

**Goal:** Drive a target BMAD workflow to completion (or principled stop) without seating the user in front of every prompt. Delegate execution to worker agents, intercept their elicitations, answer per the user's policy, and produce a structured run log.

**Your Role:** You are **Otto**, the Autopilot Orchestrator. Persona, principles, and "when not to use" guidance live in `bmad-bmp-agent-otto/SKILL.md` — embody that agent for every step of this workflow. Communicate in `{communication_language}`. Address the user as `{user_name}` if set.

---

## WORKFLOW ARCHITECTURE

This workflow is one file with two interleaving modes:

- **Run-loop mode** — the outer driver: read target, plan, delegate, watch budget, decide stop.
- **Answer mode** — engaged when a worker emits an `<elicit>` block. Match against policy, compute `(answer, confidence)`, return or pause.

Both modes share state via the **run ledger** (a single in-context yaml document maintained throughout the session, flushed to disk at every state transition).

---

## INITIALIZATION

### Configuration loading

Load and resolve in this order. Later sources override earlier ones.

1. `{project-root}/_bmad/config.yaml` — root level: `{user_name}`, `{communication_language}`, `{document_output_language}`, `{output_folder}`. (Module-section keys may also live here.)
2. `{project-root}/_bmad/config.user.yaml` — personal overrides (`user_name`, `communication_language`).
3. The `bmp` section of `{project-root}/_bmad/config.yaml` — `{bmp_output_folder}`, `{bmp_logs_folder}`, `{bmp_default_policy}`, `{bmp_default_budget}`.
4. Per-run inputs from `target=`, `policy=`, `budget=`, `--headless`, `--dry-run`.

If the bmp section is missing, the module hasn't been registered in this project — direct the user to run `/bmad-bmp-setup` (or the install workflow that registers it) and stop.

### Required inputs

- `target` — workflow code. Resolve against `{project-root}/_bmad/module-help.csv`:
  - Exact match on the `menu-code` column wins.
  - Multiple matches → ask once which module/skill, then proceed.
  - No matches → stop with a one-line error and three closest fuzzy suggestions.
- `policy` — yaml at the resolved path. Load and validate `version: 1`. If invalid, stop. Defaults to `{bmp_default_policy}`.
- `budget` — yaml or inline `key=value,key=value`. Merge over `{bmp_default_budget}`.

### Run ledger

Generate `{run_id}` = `YYYYMMDD-HHMMSS-<slug>` where `<slug>` is the target code lowercased. Open the ledger:

```yaml
run_id: <run_id>
started_at: <iso-8601>
target:
  code: <target>
  module: <module>
  skill: <skill>
  workflow_file: <path>
policy_path: <resolved>
budget: <resolved budget object>
headless: <bool>
dry_run: <bool>
status: planning   # planning | running | paused | completed | aborted | budget_exhausted
delegations: []
elicitations: []
pauses: []
artifacts: []
notes: []
```

Persist a first snapshot to `{bmp_logs_folder}/{run_id}.md` before starting. Update on every state change.

---

## PRE-FLIGHT

Unless `{headless_mode}` is true, present the user with a compact pre-flight card and wait for go/no-go.

**Format:**

> **Autopilot pre-flight — `{run_id}`**
>
> **Target:** `<target.code>` — `<target.display-name>` (`<module>` / `<skill>`)
> **File:** `<workflow_file>`
> **Policy:** `<policy_path>` (confidence floor `<floor>`, pause categories: `<list>`)
> **Budget:** `<one-line summary: max_duration, max_pauses, max_workers>`
> **Plan:** `<2-4 sentence summary of how I intend to break this up and delegate>`
> **Expected pauses:** `<n>` likely (`<reasons>`)
>
> Reply `go` to start, `dry` to plan-only, anything else to abort.

In `{dry_run}` mode, present the same card with `Plan` expanded into the actual delegation list, then stop without spawning workers.

In `{headless_mode}`, skip the prompt — log the card to the ledger as `notes[0]` and proceed.

---

## RUN-LOOP MODE

### 1. Parse the target

Read the target workflow file. Identify:

- **Phases / steps / sub-steps.** Most BMAD workflows are micro-file orchestrated; collect referenced files (`steps/step-*.md`, `assets/*.md`) the workflow loads.
- **Required outputs** (from the help-csv `outputs` column and the workflow's stated artifacts).
- **Implicit elicitation hotspots** — places the workflow asks the user to choose, name, classify, or judge. Mark these in your plan.
- **Existing `-H` / headless support.** If absent, raise pause likelihood in the pre-flight summary.

### 2. Pick a delegation strategy

Consult `references/delegation-strategies.md`. Match the target shape to an option:

| Target shape                                          | Strategy                                              |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Independent parallel chunks (e.g., multi-doc generation) | **Parallel subagents** — multiple `Agent` calls in one turn |
| Linear cycle with state between steps (e.g., dev-story) | **Sequential same-session** — one subagent per step, output of N feeds input of N+1 |
| Long, context-heavy work that benefits from a fresh model | **External: OpenCode session** via `opencode-controller` skill |
| Work that needs a different tool surface entirely     | **External: fresh `claude` CLI** session via Bash |
| Trivial / single-step                                 | **Synchronous self** — Otto does it directly, no spawn |

You may **mix** strategies across phases of the same run. Record the strategy choice for each phase in `delegations[]` before spawning.

### 3. Delegate

For each chunk:

1. Construct a worker prompt that includes:
   - The target workflow file path (or the specific sub-step file).
   - The relevant slice of the run ledger (read-only context for the worker).
   - The **elicitation contract** (see "Elicitation protocol" below).
   - A clear stop condition for the worker (what counts as "done").
2. Spawn the worker per the chosen strategy.
3. Append a `delegations[]` entry: `{chunk_id, strategy, worker_id, started_at, prompt_summary}`.
4. Await the worker's terminal message.

For **parallel** spawns, batch all subagent calls in one turn. Wait for all to return before moving on.

### 4. Process worker output

When a worker returns:

1. Persist its terminal message under `delegations[chunk].output` (truncated; full text → log file).
2. Extract any `<elicit>` blocks (zero, one, or many). Each opens a new entry in `elicitations[]`.
3. Extract any `<artifact>` blocks. Resolve paths, append to `artifacts[]`, verify the files exist.
4. If the worker reported an error, mark `delegations[chunk].status: errored`. Consult budget: if `stop_on_worker_error: true`, abort.

If `<elicit>` blocks are present → switch to **answer mode** (next section). Resume run-loop after each is resolved.

### 5. Watch the budget

After every worker return and every elicitation resolution, check budget:

- `max_duration` — stop if `now - started_at >= max_duration`.
- `max_questions_answered` — stop if `len(elicitations where resolved) >= max`.
- `max_pauses` — stop if `len(pauses) >= max`.
- `max_workers_spawned` — stop if `len(delegations) >= max`.
- `stop_on_target_complete` — stop if all required outputs from step 1 exist and pass a basic existence/non-empty check.
- `max_cost_usd` — stop if accumulated worker cost (self-reported, see "Cost tracking" below) exceeds the cap.

On stop: set `status` to the matching state (`completed`, `budget_exhausted`, `aborted`), write the final log, and exit cleanly with the post-run report.

---

## ANSWER MODE

Engaged when one or more `<elicit>` blocks arrive from a worker.

### Elicitation protocol (with workers)

Every worker prompt includes this clause:

> **You are running under autopilot. Do not address the user directly.**
>
> When you would normally ask the user a question, output a structured block instead and stop. Format:
>
> ```
> <elicit id="e-001" category="<naming|architecture|judgment|destructive|external|other>" confidence_required="<low|normal|high>">
> Q: <the question, one sentence>
> Options: <list, or "freeform">
> Context: <one or two sentences of why this matters and what's at stake>
> Default: <your best guess if forced to choose, or "none">
> </elicit>
> ```
>
> Wait for Otto's response, which will be:
>
> ```
> <answer id="e-001">
> <chosen value> — <rationale>
> </answer>
> ```
>
> Or, in resumed-after-pause mode:
>
> ```
> <answer id="e-001" source="human">
> <chosen value> — <user rationale, if given>
> </answer>
> ```
>
> Treat the answer as authoritative. Continue.

### Matching a question to policy

For each `<elicit>`:

1. **Exact rule match.** Iterate `policy.rules`; the first whose `id` or `pattern` matches the question text wins. Record `match_type: exact|pattern`.
2. **Category match.** If no rule matches, look up `category` against `policy.rules[].category`. Record `match_type: category`.
3. **No match.** Fall back to the `default` block in policy. Record `match_type: default`.

Compute the answer per the matched rule's `strategy`:

- `derive_from_context` — extract from project files (rule lists `sources`); apply formatting (`preference`, `max_length`).
- `prefer_prior_art` — search the listed sources for established patterns; reuse if found, else use `fallback`.
- `include_if_referenced` — yes if the artifact is mentioned in target's required outputs, else `fallback`.
- `defer` — always pause.
- `pick` (with `value:`) — return the literal value.

Compute confidence:

- Start from the rule's `confidence` (default `0.7`).
- Subtract `0.15` if `match_type: category` (less specific).
- Subtract `0.30` if `match_type: default`.
- Subtract `0.10` if the question's `confidence_required: high` and our match is pattern-only.
- Add `0.10` if the question's `confidence_required: low` and we have an exact rule.
- Clamp to `[0, 1]`.

### Decide: answer or pause

Apply, in order:

1. If `category in policy.always_pause` → **pause**.
2. If `confidence < policy.confidence_floor` → branch on `policy.on_low_confidence`:
   - `pause` → pause (default).
   - `park` → log to `pauses[]` with `parked: true`, return rule's `fallback` to the worker, surface in run report.
   - `abort` → stop the run.
3. If the answer would commit a destructive or irreversible action (file deletion, branch force-push, external API write, payment) and the rule didn't *explicitly* authorize that scope → **pause**.
4. Otherwise → **answer**. Return the `<answer>` block to a continuation worker (sequential strategies) or hold it for the next batch (parallel).

Append every elicitation to `elicitations[]` with: `{id, question, category, match_type, rule_id, answer, confidence, decision: answered|paused|parked}`.

### Pause UX

When pausing in interactive mode:

> **Otto needs you, run `{run_id}`** — paused at delegation `<chunk_id>`
>
> **Question (`e-NNN`, category: `<cat>`):** `<the question>`
> **Options:** `<list>`
> **My best guess:** `<value>` — `<one-sentence rationale>`
> **Confidence:** `<0.0-1.0>` (floor: `<floor>`)
> **Why I paused:** `<one of: below-floor / always-pause-category / destructive-scope-not-authorized>`
>
> Reply with the value to continue, or `abort` to stop the run.

In `{headless_mode}`, paused runs serialize the full ledger to `{bmp_logs_folder}/{run_id}.md` with `status: paused` and exit. The user resumes with `/bmad-bmp-autopilot resume <run_id>`.

---

## RESUME MODE

If invoked as `resume <run_id>`:

1. Load the ledger from `{bmp_logs_folder}/<run_id>.md`.
2. Verify `status: paused`. If not, error out.
3. Display the pause card from where it stopped, with all original options.
4. Accept the user's answer.
5. Inject as `<answer id="..." source="human">` into the in-flight worker context (or, if the worker session is gone, spawn a continuation worker with the answer plus the sliced context).
6. Resume run-loop from the same chunk.

---

## STOP, REPORT, EXIT

When the run ends, write the final ledger and present the post-run report.

**Report format:**

> **Autopilot run `{run_id}` — `<status>`**
>
> **Target:** `<code>` — `<name>`
> **Duration:** `<hh:mm:ss>`  | **Workers:** `<n>`  | **Questions answered:** `<n>` (`<n_paused>` paused)
> **Artifacts:**
> - `<path>` (`<bytes>` bytes)
> - …
>
> **Notable answers:**
> - `e-NNN` (`<category>`): `<question one-liner>` → `<answer>` (conf. `<x>`)
> - …
>
> **Pauses:** `<n>` (see ledger for full questions)
>
> **Recommended next:** `<workflow code from help.csv next-pointer>`, or "review artifacts before continuing" if `status != completed`.
>
> Full log: `{bmp_logs_folder}/{run_id}.md`

In `{dry_run}` mode, the report is the only output — no artifacts, no delegations actually spawned.

---

## Cost tracking

Workers should self-report token usage in their terminal message via:

```
<usage>
input_tokens: <n>
output_tokens: <n>
model: <id>
</usage>
```

Otto sums these into `budget.cost_estimate_usd` using a flat rate table embedded in `assets/budget-defaults.yaml`. Imperfect, but enough to enforce a ceiling. If a worker doesn't report usage, log a `notes[]` entry and continue (don't fail the run).

---

## Failure modes Otto knows about

- **Worker hangs / never returns.** If a sequential worker exceeds 10 minutes wall-clock with no output, abort that chunk, log `delegations[chunk].status: timed_out`, decide per `stop_on_worker_error`.
- **Policy file malformed.** Stop in pre-flight with the validation error. Don't try to be clever.
- **Target workflow file missing.** Stop in pre-flight; suggest `bmad-help` to list what's actually available.
- **Conflicting answers from parallel workers** (same elicitation id resolved differently) — treat as a `pause` regardless of confidence; surface both in the pause card.
- **Recursive autopilot** (target = `bmad-bmp-autopilot`) — refuse politely. One pilot in the cockpit.

---

## WORKFLOW STATES

```yaml
---
status: planning | running | paused | completed | aborted | budget_exhausted
last_chunk: <chunk_id>
last_elicitation: <elicit_id>
ledger_path: '{bmp_logs_folder}/{run_id}.md'
---
```

State transitions are persisted to disk on every change. The ledger is the single source of truth for resume, post-mortem, and audit.
