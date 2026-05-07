# Story 1.4: Update documentation

Status: done

## Story

As a repository reader,
I want the README to describe this repository as a BMAD-compatible skill package,
so that I understand how the skill and bundled MCP server fit together.

## Acceptance Criteria

1. The README identifies the repository as a BMAD-compatible skill package.
2. Standalone-first installation language is replaced with skill installation
   guidance.
3. The README points agents to the skill entry point and references.
4. Development instructions remain available for maintainers.

## Tasks / Subtasks

- [x] Update the installation section for skill-based installation.
- [x] Add a skill package structure section.
- [x] Preserve configuration and development guidance relevant to maintainers.

## Dev Notes

- The README remains human-facing. Agent-facing operational details live under
  `skill/`.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#3.4 Documentation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Documentation
  dual-maintenance]

## Dev Agent Record

### Completion Notes List

- Updated the README to reflect the skill package model.

### File List

- `README.md`
