---
proposalId: ''
runId: ''
generatedAt: ''
vector: ''
complexity: ''         # XS | S | M | L | XL
surfaceArea: []        # e.g. ['src/trello-client.ts', 'src/index.ts', 'docs/mcp-documentation.md']
abstractionScore: 0.0
confidence: 0.0
qualityGates:
  hasRepoEvidence: false
  hasAbstractionReasoning: false
  hasTestableAcceptance: false
---

# {{proposalTitle}}

## Context

[Project state, relevant prior art, why this came up now. Cite specific repo evidence (file:line, PR#, issue#, commit hash).]

## Problem

[The user-facing or maintainer-facing pain. Frame in terms of how humans actually use the system, not just what's missing in the code.]

## Proposed Solution

[The shape of the change at the API/tool/UX level. Lead with the higher-order abstraction. Show interface design, not implementation.]

## Higher-Order Abstraction Notes

[Required section. Justify why this proposal is NOT a 1:1 wrapper of an upstream endpoint or a mechanical port. Show what user intent or workflow pattern the abstraction serves. If this proposal IS a low-level addition, justify why higher abstraction is not appropriate yet.]

## Acceptance Criteria

[Testable bullet list. Each criterion must be observable: a command, an API response, a file diff, a UI state. Avoid vague verbs like "improve" or "enhance".]

- [ ] ...
- [ ] ...
- [ ] ...

## Out-of-Scope

[Explicit non-goals. What an architect/dev should NOT do under this issue. Prevents scope creep.]

## References

[Repo evidence (file paths, line numbers), PRs, issues, discussions, external docs (Trello API, MCP spec). Minimum one repo-evidence reference required.]

## Tracking Metadata

```yaml
ledgerKey: '{{proposalId}}'
vector: '{{vector}}'
complexity: '{{complexity}}'
surfaceArea: {{surfaceArea}}
generatedBy: 'enhancement-forge'
generatedAt: '{{generatedAt}}'
runId: '{{runId}}'
```
