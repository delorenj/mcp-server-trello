# Delegation strategies — Otto's toolbox

Otto picks a strategy per chunk based on shape, parallelizability, context needs, and the surrounding budget. He may **mix** strategies across phases of a single run. This document is consulted at runtime; it's the menu.

---

## 1. Parallel subagents

**Mechanism:** Multiple `Agent` tool calls emitted in a single turn. Each subagent runs in its own Claude Code agent context with the `subagent_type` Otto picks (general-purpose, Explore, frontend-developer, etc.). Results return as a batch.

**Use when:**
- The work decomposes into independent chunks with no shared state between them (e.g., generate three separate stories, audit four files, scan multiple modules).
- Each chunk's prompt is small enough to pass into a fresh context.
- Latency matters more than synchronization complexity.

**Don't use when:**
- Chunks share state or one's output feeds another's input.
- Any chunk is likely to elicit (handling parallel pauses is messy — see `workflow.md` "Conflicting answers from parallel workers").

**Worker prompt template:**
```
You are a worker spawned by Otto (autopilot orchestrator) for run <run_id>, chunk <chunk_id>.

Goal: <one-sentence goal>
Target workflow: <path>
Specific scope: <what slice of the target you own>

Operating rules:
- You are running under autopilot. Do not address the user directly.
- If you would normally elicit, emit <elicit ...> and stop. Do not guess.
- Report token usage in a <usage> block before exiting.
- Report any artifacts you produce in <artifact path="..."/> blocks.

When done, return a single terminal message containing your work.
```

---

## 2. Sequential same-session

**Mechanism:** A series of `Agent` calls where each waits for the prior to finish and the output of N is passed into the prompt of N+1. Otto stays in the orchestrator role; workers are short-lived.

**Use when:**
- The target is a state machine (e.g., `bmad-dev-story` → `bmad-code-review` → back to dev-story until pass).
- Step N's output materially shapes step N+1's prompt.
- You expect elicitations and need to resolve them between steps cleanly.

**Don't use when:**
- The target is parallelizable — you're leaving wall-clock on the table.
- Step N's output is enormous (>20K tokens). At that point, persist to disk and pass a path, not the content.

**State carry pattern:** between steps, Otto extracts only the *minimum* state the next step needs (decisions made, artifacts produced, open questions resolved). Don't pipe full transcripts.

---

## 3. External: OpenCode session

**Mechanism:** Use the `opencode-controller` skill to spawn a session on a different runtime (different model, different tool surface, different context budget). Otto sends a prompt + waits + retrieves output.

**Use when:**
- The chunk needs a model Otto doesn't have direct access to (e.g., a longer-context model for a heavy doc generation; a faster cheaper model for a high-volume routine task).
- The chunk benefits from a tool surface Otto doesn't have (e.g., browser automation via OpenCode's available tools).
- Token cost matters and a cheaper external model can do the job.

**Don't use when:**
- The chunk is trivial — the round-trip overhead exceeds the work.
- The chunk needs tight coordination with Otto's local state (the round-trip latency is real).

**Setup check:** Otto verifies `opencode-controller` skill is available before picking this. If not, fall back to one of the in-session strategies and log a `notes[]` entry.

---

## 4. External: fresh `claude` CLI session

**Mechanism:** Shell out via `Bash` to launch a new `claude` CLI session with a single prompt argument. Capture stdout. Useful for full context isolation.

**Use when:**
- The work needs a *truly* clean context (no parent conversation history, no leaked instructions).
- You want to A/B test a chunk against the same chunk run by Otto's session.
- The chunk produces an artifact that should be auditable independently.

**Don't use when:**
- You need real-time feedback from the worker (CLI invocation is one-shot).
- The chunk is short — startup overhead dominates.

**Output handling:** Treat stdout as the worker's terminal message. Parse `<elicit>`, `<artifact>`, `<usage>` blocks the same way as in-session strategies.

---

## 5. Synchronous self

**Mechanism:** Otto does the work himself, no spawn.

**Use when:**
- The chunk is one or two tool calls Otto can execute directly (read a file, write a small artifact, run a single command).
- Spawning a worker would be ceremony for ceremony's sake.
- The chunk is the orchestration itself (e.g., reading the target workflow file, building the plan).

**Don't use when:**
- The chunk is large enough to bloat Otto's context (delegate to keep his ledger lean).
- The chunk requires a different tool / persona than Otto has.

---

## Strategy mixing — example

Target: `bmad-create-epics-and-stories` (CE) — read PRD + architecture, produce N epic files and M story files per epic.

Otto's plan:
- **Phase 1 (synchronous self):** read PRD, architecture, glossary; produce a flat list of epic stubs.
- **Phase 2 (parallel subagents):** spawn one subagent per epic to expand into full epic doc + child stories. Each is independent.
- **Phase 3 (sequential same-session):** validate each produced epic doc against acceptance template. If validation fails, spawn a fix-it worker with the validation output.
- **Phase 4 (synchronous self):** assemble the index, write the run summary.

Recorded in the ledger:
```yaml
delegations:
  - chunk_id: ce-phase-1
    strategy: synchronous_self
    status: completed
  - chunk_id: ce-phase-2
    strategy: parallel_subagents
    workers: [w-001, w-002, w-003, w-004]
    status: completed
  - chunk_id: ce-phase-3
    strategy: sequential_same_session
    status: running
```

---

## Anti-patterns Otto avoids

- **Recursive delegation.** A worker spawning subagents to do its assigned chunk. Workers do work; Otto does orchestration.
- **One-worker-many-chunks.** A worker prompt that tries to do five steps "while you're at it." Spawn five workers (sequentially or in parallel).
- **State piped through prompts.** Passing transcripts forward instead of distilled decisions. Distill or persist.
- **Strategy lock-in.** Picking a strategy at run start and refusing to change. If phase 2 reveals the work is more parallel than expected, switch.
