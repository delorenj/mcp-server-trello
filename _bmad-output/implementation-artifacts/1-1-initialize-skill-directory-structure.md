# Story 1.1: Initialize skill directory structure

Status: done

## Story

As a Trello MCP skill maintainer,
I want a complete skill package directory structure,
so that agents can load the skill and find install, source, and reference
materials in predictable locations.

## Acceptance Criteria

1. The repository contains `skill/SKILL.md`.
2. The repository contains `skill/scripts/install.sh`.
3. The repository contains `skill/references/trello-mcp/`.
4. The repository contains `skill/assets/source/` with bundled MCP server
   source needed for a local build.
5. The repository contains a repeatable packaging task to refresh the bundled
   source.

## Tasks / Subtasks

- [x] Create the skill entry point.
- [x] Create the installer directory and script.
- [x] Create progressive-discovery reference directories.
- [x] Bundle the server source under the skill assets directory.
- [x] Add a packaging task that refreshes bundled source from repository files.

## Dev Notes

- Architecture requires a Cloudflare-style progressive-discovery layout:
  `SKILL.md`, `scripts/`, `references/trello-mcp/`, and `assets/source/`.
- No generated working files were saved to the repository root.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Revised Target
  Architecture]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]

## Dev Agent Record

### Completion Notes List

- Created the required skill package structure.
- Bundled source files for self-contained installation.

### File List

- `skill/SKILL.md`
- `skill/scripts/install.sh`
- `skill/references/trello-mcp/README.md`
- `skill/references/trello-mcp/configuration.md`
- `skill/references/trello-mcp/api.md`
- `skill/references/trello-mcp/patterns.md`
- `skill/references/trello-mcp/gotchas.md`
- `skill/assets/source/`
- `scripts/build-skill-assets.sh`
- `mise.toml`
