---
bootstrapped_by: ''         # 'user' | 'cron' | (left empty in template)
generated_at: ''
schema_version: 1
---

# Improvement Vectors

Opinionated north star for enhancement-forge. Each vector defines a category of improvement the workflow can pursue. Vectors influence the Vector Selector's choice, weighted by recency dedup against the ledger.

## How to use

- Add, remove, or reweight vectors freely. Higher `weight` biases the Vector Selector toward that vector when other factors are equal.
- Add `cooldown_runs` to a vector if you want to space out proposals in that category (the selector will deprioritize the vector for N runs after a successful proposal).
- The `examples` block guides the Idea Selector toward the abstraction-up bias and away from 1:1 wrapper anti-patterns.

---

## Vectors

### Feature Parity
- weight: 1.0
- cooldown_runs: 0
- description: Surface gaps between the upstream system (Trello) and what is exposed via this MCP server. Bias toward higher-order abstractions, not endpoint-by-endpoint ports.
- examples:
  - "Implement a Checklist higher-order tool that wraps create-checklist + add-item + set-checked, exposing user-intent verbs (`create_checklist_with_items`, `mark_checklist_done`)"
  - "Add a Card Templating concept that bundles labels, lists, members, and a checklist into one repeatable shape"

### UX/Ergonomics
- weight: 1.0
- cooldown_runs: 1
- description: Improve how humans (or agents) actually use the tools. Reduce verbosity, improve defaults, surface natural-language alternatives, eliminate repetitive multi-call patterns.
- examples:
  - "Auto-attach the active board context so callers don't pass `board_id` on every call"
  - "Bulk operations (move N cards, archive matching cards) instead of repeated single calls"

### Observability
- weight: 0.8
- cooldown_runs: 2
- description: Structured logging, traceability, metrics, and health endpoints. Bias toward useful introspection that aids debugging and post-incident review.
- examples:
  - "Emit structured request/response trace events with correlation IDs"
  - "/health/detailed endpoint returns Trello rate-limit budget snapshot"

### Performance
- weight: 0.7
- cooldown_runs: 2
- description: Latency, throughput, rate-limit pressure, caching strategies. Must include measurement plan, not just "feel".
- examples:
  - "Cache board metadata with explicit invalidation on board-level events"
  - "Adaptive rate limiter that backs off ahead of Trello 429s"

### Documentation
- weight: 0.6
- cooldown_runs: 3
- description: Reference docs, examples, integration guides. Avoid "improve docs" generalities; pick a specific gap.
- examples:
  - "Per-tool examples in the api.md doc generated from real tool calls"
  - "Decision log explaining why certain Trello primitives are NOT exposed"

### Security
- weight: 0.9
- cooldown_runs: 2
- description: AuthZ, input validation, secret hygiene, supply chain. Bias toward defense-in-depth, not just band-aids.
- examples:
  - "Per-tool permission scopes mapped to Trello API key scopes"
  - "Secret redaction in error responses and logs"

### Maintainability
- weight: 0.7
- cooldown_runs: 2
- description: Internal code quality, modularity, type safety, test coverage. The proposal must show *why* the maintainability win unlocks future change, not just abstract "cleanup".
- examples:
  - "Property-based tests for the cache invalidation rules"
