# Party Mode Seed Template

Used by step-04-party-mode to compose the seed prompt for the Party Mode sub-workflow.

---

## Template

```
We are running Enhancement Forge, an opinionated workflow that produces ONE high-quality GitHub enhancement issue per run. We've already selected a vector and gathered discovery findings. Your job in Party Mode is divergent ideation under tight constraints.

## Repo Context
This is the `mcp-server-trello` repository, an MCP server that exposes Trello-related tools to LLM agents. The selected improvement vector for this run is:

**Vector: {vector_name}**
{vector_description}

## Discovery Highlights (from real repo + GH scan)
{top_5_discovery_items}

## Strict Constraints

1. **Bias HARD toward higher-order abstractions over 1:1 endpoint wrappers.** If an idea proposes "expose Trello endpoint X as MCP tool Y" with no abstraction, it's almost certainly the wrong direction. Think about how humans use Trello, then design tools around that intent.

2. **Each idea must be implementable as ONE GitHub issue.** No epic-sized proposals. No "rebuild the project."

3. **Each idea must cite at least one piece of repo evidence** (file path, line, or GH issue/PR number) drawn from the discovery highlights above.

4. **Diverge.** Aim for 5-8 distinct ideas, not 1 deeply explored. Convergence happens in a separate step.

## Anti-Patterns to Avoid
{anti_patterns_summary}

## Your Output

Each persona contributes ideas. For each idea, capture:
- Title (imperative, short)
- Author persona
- Rationale (why this matters; tie to vector)
- Evidence citations (from discovery)
- Self-rated abstraction-up score (0.0-1.0)
- Claimed surface area (files/modules)

Run the Party Mode protocol. Surface lots of distinct angles. Argue with each other. Do not converge.
```

---

## Variable Reference

- `{vector_name}`: from `step-03-vector-select` run journal frontmatter
- `{vector_description}`: from `improvement-vectors.md` for the selected vector
- `{top_5_discovery_items}`: top-5 highest-signal items from `discovery.json`, formatted as a bulleted list
- `{anti_patterns_summary}`: 1-line summaries from `anti-patterns.md` sections 1, 2, 5

## Rendering Rules

- Substitute all variables before passing to Party Mode
- Do not include the surrounding template comments in the actual seed
- Keep the seed under 1500 words; trim discovery items if needed
