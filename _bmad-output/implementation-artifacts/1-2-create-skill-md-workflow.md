# Story 1.2: Create SKILL.md workflow

Status: done

## Story

As an AI agent using Trello,
I want `SKILL.md` to route me to setup, API, workflow, and gotcha references,
so that I can use the Trello MCP server without scanning unrelated files.

## Acceptance Criteria

1. `SKILL.md` has trigger-rich frontmatter for Trello MCP usage.
2. `SKILL.md` documents first-run activation and install verification.
3. `SKILL.md` points agents to focused reference files.
4. `SKILL.md` groups tools by workflow capability.
5. `SKILL.md` states agent rules for ID discovery, dates, rate limits, and
   destructive actions.

## Tasks / Subtasks

- [x] Replace the minimal workflow with a progressive-discovery router.
- [x] Document first-run activation against the local built server.
- [x] Add tool routing groups for boards, cards, checklists, comments,
  attachments, labels, members, and health.
- [x] Add guardrails for dates, IDs, and Trello side effects.

## Dev Notes

- The frontmatter description is the primary skill-loading trigger, so it names
  the main Trello domains explicitly.
- The workflow uses reference files to keep `SKILL.md` compact while preserving
  enough context for common operations.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#3.3 Agent Workflow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Progressive
  discovery architecture]

## Dev Agent Record

### Completion Notes List

- Expanded `SKILL.md` into the agent-facing router and workflow guide.

### File List

- `skill/SKILL.md`
