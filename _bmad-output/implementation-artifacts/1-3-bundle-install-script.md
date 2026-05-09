# Story 1.3: Bundle install script

Status: done

## Story

As a skill user,
I want the bundled install script to build the Trello MCP server from packaged
source when possible,
so that the skill works without depending on a live package registry at runtime.

## Acceptance Criteria

1. `skill/scripts/install.sh` is executable.
2. The script builds from `skill/assets/source/` when Bun is available.
3. The script falls back to the published package install path when Bun is not
   available.
4. The script prints the MCP command path and required environment variables.
5. The script is safe to run multiple times.
6. The bundled source includes the Smithery manifest used by the existing
   distribution path.

## Tasks / Subtasks

- [x] Detect the skill root and bundled source directory.
- [x] Copy source to a user data install directory.
- [x] Install dependencies and build with Bun.
- [x] Fall back to Smithery installation through `npx`.
- [x] Print required Trello credential configuration.
- [x] Include `smithery.yaml` in the source bundle.

## Dev Notes

- Runtime build output goes under
  `{XDG_DATA_HOME:-$HOME/.local/share}/mcp-server-trello-skill/server`.
- Re-running the script replaces the runtime install directory before rebuilding
  from the bundled source.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#3.2 First-Run
  Installation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Build granularity
  question]

## Dev Agent Record

### Completion Notes List

- Reworked the installer from registry-first to bundled-source-first.

### File List

- `skill/scripts/install.sh`
- `skill/assets/source/`
- `scripts/build-skill-assets.sh`
- `mise.toml`
