---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - skill/SKILL.md
  - README.md
  - smithery.yaml
  - server.json
workflowType: 'architecture'
project_name: 'mcp-server-trello'
user_name: 'Jarad'
date: '2026-05-03'
lastStep: 8
status: 'complete'
completedAt: '2026-05-03'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- Create a complete skill directory structure (`skill/`, `references/`, `assets/`, `scripts/`) following the skill-creator specification
- Build SKILL.md as the primary agent entry point with decision trees and comprehensive workflow instructions for all 25+ Trello MCP tools (adopting Cloudflare progressive discovery pattern)
- Bundle the MCP server source inside the skill package so it's self-contained with build-on-install, using npm as a fallback rather than primary distribution path
- Implement first-run activation that detects missing server/config and guides setup idempotently
- Extract tool documentation from README into `references/api.md` for agent consumption, generated from TypeScript tool definitions (the canonical source)
- Provide agent workflow instructions covering common Trello operations (board exploration → card management → checklist workflows)
- Maintain README as the human-facing document while skill serves as the agent-facing equivalent (complementary, not replacement)

**Non-Functional Requirements:**
- **Self-containment**: Skill package must work offline after initial install — no runtime network fetch required (build from bundled source)
- **Idempotency**: Running install/activation multiple times must be safe and produce the same state
- **Agent ergonomics**: SKILL.md must give agents enough context to use tools correctly without reading external docs
- **Rate limit awareness**: Agents must understand Trello API rate limits (300 reqs/10s per key, 100 reqs/10s per token) to avoid throttling
- **Auth clarity**: TRELLO_API_KEY and TRELLO_TOKEN setup must be documented and discoverable
- **Discoverability**: SKILL.md frontmatter `description` field is the ONLY trigger mechanism for skill loading — it must be comprehensive

**Scale & Complexity:**
- Primary domain: Developer tooling / MCP skill packaging with bundled MCP server
- Complexity level: Medium
- Estimated architectural components: 5-7 (skill structure with progressive disclosure, source bundling pipeline, activation system with npm fallback, documentation extraction layer, configuration management, distribution artifact via .skill, ecosystem integration)

### Technical Constraints & Dependencies

- **Runtime**: Bun-powered TypeScript server (`node build/index.js` per smithery.yaml)
- **Transport**: stdio (no HTTP server to manage)
- **Auth**: Two env vars required — `TRELLO_API_KEY` (secret) and `TRELLO_TOKEN` (secret)
- **Optional config**: `TRELLO_BOARD_ID` for board-scoped operations
- **Existing distribution**: npm (`@delorenj/mcp-server-trello` v1.7.1), Smithery, MCP Registry
- **Build output**: `build/` directory contains the compiled server
- **Current skill location**: Inside the MCP server repo at `skill/` — creates circular dependency
- **Bundling strategy (first principles decision)**: Bundle source in `assets/source/` with build-on-install, npm fallback. This provides self-containment (PRD requirement) while preserving update path. Binary-only bundling would stale and lacks platform flexibility.

### Cross-Cutting Concerns Identified

1. **Circular dependency resolution**: Skill lives in the MCP server's repo and currently installs from npm — the same package it ships with. First principles analysis favors in-repo with source bundling since it eliminates circularity while preserving cohesion.
2. **Documentation dual-maintenance**: Tool docs currently live only in README. Splitting to `references/api.md` creates two sources of truth unless an extraction strategy exists. api.md should be generated from TypeScript tool definitions (the canonical source) rather than hand-maintained. README remains the human-facing document; `references/api.md` is the agent-facing equivalent.
3. **Packaging pipeline**: No `.skill` package builder exists. Need to define build → validate → distribute flow via `package_skill.py`.
4. **Ecosystem integration**: No `.codex-plugin/plugin.json` or marketplace entry. Architecture should account for where these fit.
5. **Operational knowledge capture**: Rate limits, date formats, auth setup, and error recovery patterns must be documented in the skill so agents don't need external references. This content cannot be derived from MCP tool schemas — it requires human-authored context.
6. **Progressive discovery architecture**: Cloudflare reference pattern shows that a SKILL.md router + categorized references is the right model. Decision trees in SKILL.md are essential for discoverability (agents route to the right reference without scanning all of api.md), not optional decoration.
7. **Build granularity question**: What exactly gets bundled? Source code allows on-demand build with local Bun. Pre-built binary is faster but platform-constrained and stale-prone. Hybrid: source bundled, install.sh builds locally, falls back to npm if Bun unavailable.

### Revised Target Architecture (Post First-Principles Analysis)

```
skill/
├── SKILL.md                   # Discovery layer: decision trees + product index (~200 lines)
├── scripts/
│   └── install.sh             # Runtime layer: build from source → npm fallback
├── references/
│   └── trello-mcp/
│       ├── README.md          # Entry point, reading order, cross-references
│       ├── configuration.md   # Auth env vars, rate limit config
│       ├── api.md             # Tool signatures (extracted from TS, not hand-maintained)
│       ├── patterns.md        # Board→card→checklist workflows
│       └── gotchas.md         # Date formats, limits, error recovery
└── assets/
    └── source/                # Bundled MCP server source for self-contained build
```

---

## Starter Template Evaluation

### Primary Technology Domain

Developer tooling / MCP skill packaging with bundled MCP server. Not a greenfield
project — an architectural retrofit of an existing Bun/TypeScript MCP server into
a self-contained .skill distributable.

### Technology Stack (Pre-Existing, Immutable)

- **Runtime**: Bun-powered TypeScript → `node build/index.js`
- **Transport**: stdio (MCP protocol)
- **Distribution**: npm (`@delorenj/mcp-server-trello` v1.7.1), Smithery, MCP Registry
- **Auth**: `TRELLO_API_KEY` + `TRELLO_TOKEN` env vars

### Selected Approach: Cloudflare-Pattern Progressive Disclosure

Rather than choosing a project scaffolding CLI, the "starter" for this skill
packaging is the 5-reference-file progressive disclosure pattern adapted from
the Cloudflare ecosystem.

**Reference Architecture:**

- `references/trello-mcp/README.md` — Entry point, reading order, cross-references
- `references/trello-mcp/configuration.md` — Auth env vars, rate limit config
- `references/trello-mcp/api.md` — Tool signatures (extracted from TypeScript, not hand-maintained)
- `references/trello-mcp/patterns.md` — Board→card→checklist workflows
- `references/trello-mcp/gotchas.md` — Date formats, limits, error recovery

**SKILL.md Role:** Decision-tree router (~200 lines) — agents route to correct
reference file without scanning all of api.md. This is the Cloudflare pattern
of "product index + decision trees" that makes progressive disclosure work.

**Bundling Strategy:** Source in `assets/source/`, `install.sh` builds locally
with `bun run build`, falls back to `npm install @delorenj/mcp-server-trello`.
This provides self-containment (PRD requirement) while preserving update path.
Binary-only would stale; npm-only breaks offline requirement.

**Skill initialization:** Use skill-creator's `init_skill.py` to create the proper
directory skeleton, then customize with the Cloudflare-pattern references.

**Rationale for Selection:**
The Cloudflare skill ecosystem has proven this pattern at scale (63 reference
subdirectories, each with 5 canonical files). For 25+ Trello tools, a single
flat api.md would overload the agent context window. Progressive disclosure
via decision trees gives agents exactly what they need without scanning
irrelevant tools. The 5-file split (README, config, api, patterns, gotchas)
covers the four knowledge types any MCP skill needs: navigation, setup,
signatures, workflows, and edge cases.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Already Decided (from Steps 2 & 3):**

| Decision | Value | Source |
|----------|-------|--------|
| Language/Runtime | Bun + TypeScript | Pre-existing |
| Transport | stdio (MCP protocol) | Pre-existing |
| Auth mechanism | TRELLO_API_KEY + TRELLO_TOKEN env vars | Pre-existing |
| Bundling strategy | Source in assets/source/, build-on-install, npm fallback | Step 2 |
| Reference structure | 5-file Cloudflare pattern | Step 3 |
| SKILL.md role | Decision-tree router (~200 lines) | Step 3 |
| api.md canonical source | TypeScript tool definitions (future); README extraction (immediate) | This step |

**Critical Decisions Made:**

1. API Documentation Extraction — README extraction (ship now), TS-source script (backlogged)
2. README Remodeling — Complementary: human-facing README + agent-facing skill
3. Pipeline & Packaging — `mise run package` task, CI gate, `dist/` output
4. Ecosystem Integration — `.codex-plugin/plugin.json` and marketplace entry, create now

**Deferred Decisions:**

- AST-based api.md generation from TypeScript source (backlogged for follow-up epic)

### API Documentation Extraction

**Decision:** Extract existing tool documentation from README.md into
`references/trello-mcp/api.md` as the immediate path. Defer AST-based
extraction script to a follow-up epic.

**Rationale:** The ~400 lines of tool docs in README are well-organized by
domain (Checklist Management, Card Operations, List Operations, Comment
Management, Board/Workspace Management, Attachments). Moving them immediately
gives us a working skill. AST-based extraction from TypeScript source
eliminates the dual-maintenance problem but is a separate engineering task
that shouldn't block the packaging epic.

**Affects:** `references/trello-mcp/api.md`, `README.md`

### README Remodeling Strategy

**Decision:** Complementary model — README remains human-facing standalone
MCP server documentation; skill is the agent-facing equivalent.

- **Keep**: npm install, Smithery registration, MCP Registry, health
  monitoring endpoints, environment variable setup, architecture overview
- **Remove**: Tool-by-tool API documentation (~400 lines; moves to api.md)
- **Add**: Short "For AI Agents" section at top pointing to `skill/SKILL.md`

**Rationale:** README and skill serve different audiences. README helps
humans install and configure the server; skill helps agents use the tools.
Neither should replace the other.

**Affects:** `README.md`

### Pipeline & Packaging

**Decision:** Mise-driven pipeline with CI integration.

- `mise run package` — wraps `package_skill.py` (validate + create `.skill`)
- `mise run ci` — includes `package` as quality gate (invalid skill blocks CI)
- `.skill` output — lives in `dist/` (gitignored, built fresh on release)
- No pre-commit hook — too heavy for every commit; `package_skill.py` needs
  full file tree

**Affects:** `mise.toml`, `.gitignore`, `dist/`

### Ecosystem Integration

**Decision:** Create integration files now as part of the architecture
implementation.

- `.codex-plugin/plugin.json` — name, description, skill dependency
- Skeleton marketplace entry — establishes integration surface

**Rationale:** Low-effort, high-signal. These files define how the skill
plugs into the broader agent ecosystem. Creating them now means they're
available when the skill is stable, with no rework needed.

**Affects:** `.codex-plugin/plugin.json`, marketplace entry

### Decision Impact Analysis

**Implementation Sequence:**

1. Restructure skill/ directory (SKILL.md, references/, scripts/, assets/)
2. Extract api.md from README, build references/trello-mcp/
3. Write install.sh with build-on-install + npm fallback
4. Remodel README (remove tool docs, add "For AI Agents" pointer)
5. Create mise tasks (package, add to ci)
6. Create .codex-plugin/plugin.json and marketplace entry

**Cross-Component Dependencies:**

- api.md structure depends on reference file conventions (Step 5)
- install.sh depends on bundling strategy and auth setup docs
- mise tasks depend on pipeline decisions
- README remodel must happen AFTER api.md extraction (otherwise docs are orphaned)

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**3 critical conflict areas identified** where different AI agents could
make incompatible choices. This project's conflict surface is smaller than a
full-stack application (no database, no frontend, no API endpoints), but the
risk is real: documentation drift, broken cross-references, and install
script failures from inconsistent conventions.

### Naming Patterns

**Reference Directory:**
- Convention: `references/trello-mcp/` (domain-scoped subdirectory)
- Rule: Reference files live under domain-scoped directories, not flat in
  `references/`. This is the Cloudflare pattern (63 subdirectories) and
  prevents collision when other MCP servers or tools are added later.
- Anti-pattern: `references/api.md`, `references/config.md` (flat, fragile)

**SKILL.md Frontmatter:**
- `name`: `trello` (shorter, natural trigger word)
- `description`: Comprehensive, covering all tool domains and trigger phrases
- Rule: The description is the ONLY skill trigger mechanism. It must reference
  boards, cards, lists, checklists, comments, attachments, Trello workspace
  management, and date formatting.

**Script Naming:**
- Primary install script: `scripts/install.sh`
- No `setup.sh` or `bootstrap.sh` — naming consistency prevents agent confusion

**Reference Entry Point:**
- Convention: `references/trello-mcp/README.md`
- Matches Cloudflare ecosystem convention; agents recognize this as
  the navigation hub

### Structure Patterns

**Skill Directory Layout (Canonical):**
```
skill/
├── SKILL.md                          # Decision tree router (~200 lines)
├── scripts/
│   └── install.sh                    # Build + configure
├── references/
│   └── trello-mcp/
│       ├── README.md                 # Entry point, reading order
│       ├── configuration.md          # Auth, env vars, rate limits
│       ├── api.md                    # Tool signatures (from README)
│       ├── patterns.md               # Board→card→checklist workflows
│       └── gotchas.md                # Dates, limits, error recovery
└── assets/
    └── source/                       # Bundled MCP server source
```

**File Collocation Rule:**
- Skill files live in `skill/` directory at repo root
- MCP server source stays at repo root (`src/`, `build/`, `package.json`)
- No mixing: skill packaging is separate from server implementation
- `assets/source/` is a COPY of server source at packaging time, not the
  canonical source location

### Format Patterns

**Tool Documentation Format (api.md):**
```
### <Tool Name>

<Description of what the tool does>

**Parameters:**
- `paramName` (type, required/optional): Description
- ...

**Returns:** <return type description>

**Example:**
- "Create a card on the 'Sprint Backlog' list..."
```

**SKILL.md Decision Tree Pattern:**
Adopt Cloudflare-style progressive disclosure:

```markdown
## What do you need?
- **Configure Trello access** → See [configuration](references/trello-mcp/configuration.md)
- **Work with boards** → [api.md#board-management](references/trello-mcp/api.md#board-management)
- **Manage cards** → [api.md#card-operations](references/trello-mcp/api.md#card-operations)
- **Work with checklists** → [api.md#checklist-management](references/trello-mcp/api.md#checklist-management)
- **Best practice workflows** → [patterns.md](references/trello-mcp/patterns.md)
- **Troubleshooting** → [gotchas.md](references/trello-mcp/gotchas.md)
```

**Cross-Reference Format:**
- Within `references/trello-mcp/`: relative to current file
  (e.g., `[configuration](configuration.md)`)
- From SKILL.md to references: relative from skill root
  (e.g., `[api.md](references/trello-mcp/api.md)`)
- Absolute paths forbidden — they break when repo moves

### Communication Patterns

**install.sh Error Reporting:**
- `set -euo pipefail` — fail fast, no silent errors
- Exit codes: `1` (general failure), `2` (Bun missing, npm fallback used),
  `3` (build failure)
- All messages to stdout — agents read stdout, not stderr
- Message format: `[STATUS] Message` (e.g., `[OK] Build complete`,
  `[WARN] Bun not found, falling back to npm`)

**First-Run Activation:**
- SKILL.md documents the check inline:
  "Check if `build/index.js` exists. If not, run `bash {skill-root}/scripts/install.sh`."
- No separate hook mechanism — SKILL.md is the single activation surface

### Process Patterns

**Idempotency (install.sh):**
- Check: `build/index.js` exists AND `package.json` version matches
  installed npm version
- If both true: skip build, report `[OK] Already installed`
- If `build/index.js` missing: build from `assets/source/`
- If `build/index.js` exists but version mismatch: rebuild
- Network optional — `assets/source/` is self-contained

**Bun Version Check:**
- `command -v bun >/dev/null 2>&1` — presence check only
- No minimum version enforcement (Bun is fast-moving; pinning is fragile)
- If Bun missing: fall back to `npm install @delorenj/mcp-server-trello`
  (npm fallback from Step 2 decision)

**Activation Detection:**
- First run check in SKILL.md, not a separate script
- Single point of truth — avoids divergence between docs and implementation

### Enforcement Guidelines

**All Agents MUST:**
- Follow the cross-reference format: relative paths only
- Use `[STATUS]` message prefix in install.sh output
- Keep reference filenames exactly as specified (no `api-docs.md` variants)
- NOT modify `assets/source/` directly — it's a copy of server source at
  packaging time, not the editing target

**Pattern Verification:**
- `mise run ci` validates cross-references (no broken links)
- `mise run package` validates SKILL.md frontmatter and directory structure
- Reference files checked for naming convention compliance

**Anti-Patterns:**
- ❌ Flat references directory: `references/api.md` directly
- ❌ install.sh without `set -euo pipefail`
- ❌ Absolute paths in cross-references (e.g., `/home/user/project/skill/...`)
- ❌ Agent creates `setup.sh` when `install.sh` is the convention
- ❌ Modifying README tool docs in place without moving to api.md

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
mcp-server-trello/                        # REPO ROOT (existing)
│
├── # ── EXISTING MCP SERVER (unchanged) ──
├── src/                                   # TypeScript source (existing)
│   ├── index.ts                           # Server entry point
│   ├── tools/                             # MCP tool definitions (canonical)
│   └── ...
├── build/                                 # Compiled JS output (existing, gitignored)
│   └── index.js
├── package.json                           # npm metadata (existing)
├── tsconfig.json                          # TypeScript config (existing)
├── smithery.yaml                          # Smithery deployment (existing)
├── server.json                            # MCP Registry entry (existing)
├── README.md                              # Human-facing docs (MODIFIED in 1.4)
│
│   # ── SKILL DIRECTORY (NEW) ──
├── skill/                                 ★ ARCHITECTURE BOUNDARY ★
│   ├── SKILL.md                           # Decision tree router (~200 lines)
│   │
│   ├── scripts/                           # Runtime automation
│   │   └── install.sh                     # Build from assets/source/ → npm fallback
│   │
│   ├── references/                        # Agent-reference documentation
│   │   └── trello-mcp/                    # Domain-scoped subdirectory
│   │       ├── README.md                  # Entry point, reading order, cross-refs
│   │       ├── configuration.md           # Auth env vars, rate limits (300/10s key, 100/10s token)
│   │       ├── api.md                     # Tool signatures (extracted from README initially)
│   │       ├── patterns.md                # Board→card→checklist workflows
│   │       └── gotchas.md                 # Date formats, error recovery, anti-patterns
│   │
│   └── assets/                            # Bundled resources
│       └── source/                        # COPY of MCP server source at packaging time
│           ├── src/                       # (copied from repo root src/)
│           ├── package.json               # (copied)
│           ├── tsconfig.json              # (copied)
│           └── smithery.yaml              # (copied)
│
│   # ── PIPELINE & PACKAGING (NEW) ──
├── mise.toml                              # Mise tasks (MODIFIED: add package, ci)
├── dist/                                  # .skill output (NEW, gitignored)
│   └── trello.skill
│
│   # ── ECOSYSTEM INTEGRATION (NEW) ──
├── .codex-plugin/                         ★ Codex integration boundary ★
│   └── plugin.json                        # name, description, skill dependency
│
│   # ── BMAD ARTIFACTS (existing) ──
├── _bmad/                                 # BMAD configuration
├── _bmad-output/                          # BMAD planning + implementation artifacts
│   ├── planning-artifacts/
│   │   ├── prd.md
│   │   ├── epics.md
│   │   └── architecture.md                # THIS DOCUMENT
│   └── implementation-artifacts/
│       └── sprint-status.yaml
│
│   # ── ROOT FILES (existing) ──
├── .env                                   # TRELLO_API_KEY, TRELLO_TOKEN (gitignored)
├── .gitignore                             # + dist/, .skill, assets/source/
└── CLAUDE.md                              # Agent instructions
```

### Architectural Boundaries

| Boundary | Description | Rule |
|----------|-------------|------|
| **Skill ↔ MCP Server** | `skill/` is a packaging layer; MCP server source at repo root is canonical | Skill references server; never modifies it |
| **assets/source/ ↔ src/** | `assets/source/` is a COPY of server source, not editing target | Generated at packaging time; gitignored |
| **references/trello-mcp/ ↔ README** | `api.md` extracted from README tool docs; README retains human-facing content | No dual editing; README tool section removed after extraction |
| **SKILL.md ↔ references/** | SKILL.md routes; references contain details | Progressive disclosure: SKILL.md is the index |
| **dist/ ↔ repo** | `.skill` package is a build artifact | Gitignored; built by `mise run package` |

### Requirements to Structure Mapping

| Epic/Story | Maps To | Boundary |
|-----------|---------|----------|
| Epic 1.1: Initialize Skill Directory | `skill/` (new) | Skill domain — no MCP server source changes |
| Epic 1.2: Create SKILL.md Workflow | `skill/SKILL.md` (new) | Agent-facing entry point |
| Epic 1.3: Bundle Install Script | `skill/scripts/install.sh` (new) | Builds from `assets/source/` or npm |
| Epic 1.4: Update Documentation | `README.md` (modified), `references/trello-mcp/` (new) | Tool docs move from README → references |

### Cross-Epic Integration Points

```
Epic 1.1 (Directory Init)
  │
  ├── Creates: skill/, references/trello-mcp/, assets/source/, scripts/
  │
  ├──→ Epic 1.2 (SKILL.md) — needs directory structure to write SKILL.md
  │
  └──→ Epic 1.3 (install.sh) — needs assets/source/ to reference

Epic 1.2 (SKILL.md)
  │
  ├── References: references/trello-mcp/ files (linked from decision trees)
  │
  └──→ Epic 1.4 (Documentation) — README remodel references skill/

Epic 1.3 (install.sh)
  │
  ├── Reads: assets/source/ (build source)
  ├── Produces: build/index.js (in repo root, existing structure)
  │
  └──→ None blocked by — can run independently after 1.1

Epic 1.4 (Documentation)
  │
  ├── Reads: README.md (extracts tool docs → api.md)
  ├── Modifies: README.md (remove tool docs, add skill pointer)
  │
  └── BLOCKED BY → Epic 1.2 (needs SKILL.md to reference from README)
```

### File Organization Patterns

**What's New (created by this architecture):**

| File/Directory | Created By |
|---------------|-----------|
| `skill/` | Epic 1.1 |
| `skill/SKILL.md` | Epic 1.2 |
| `skill/scripts/install.sh` | Epic 1.3 |
| `skill/references/trello-mcp/*` | Epic 1.4 |
| `dist/` | Pipeline |
| `.codex-plugin/plugin.json` | Ecosystem |

**What's Modified:**

| File | Modified By |
|------|-----------|
| `README.md` | Epic 1.4 — remove tool docs |
| `mise.toml` | Pipeline — add package task |
| `.gitignore` | Pipeline — add dist/, .skill, assets/source/ |

**What's Unchanged:**

| File | Reason |
|------|--------|
| `src/` | MCP server source (canonical) |
| `build/` | Compile output (gitignored) |
| `package.json` | Package metadata |
| `tsconfig.json` | TypeScript config |
| `smithery.yaml` | Smithery deploy |
| `server.json` | MCP Registry |

---

## Architecture Validation

### Coherence Check

All architectural decisions are compatible with each other. Verified:

- Source bundling (`assets/source/`) + build-on-install (`install.sh`) + npm fallback form one coherent distribution pipeline
- README extraction for api.md doesn't conflict with AST-based extraction (sequential, not competing)
- Cloudflare 5-reference pattern + decision-tree SKILL.md are the same pattern, applied consistently
- mise.toml package task + CI gate + dist/ output form one coherent packaging pipeline
- `.codex-plugin/plugin.json` + marketplace entry + .skill packaging are complementary ecosystem concerns
- No contradictory decisions found

### Coverage Assessment

**All epics addressed:** Epic 1 (Skill Directory Structure → Project Structure section), Epic 2 (SKILL.md → Implementation Patterns/Naming), Epic 3 (Install Script → Implementation Patterns/Communication + Process), Epic 4 (Documentation → Implementation Patterns/Process + README remodeling decision)

**All NFRs supported:** Self-containment (source bundling), Idempotency (install.sh version check), Agent ergonomics (5-reference progressive disclosure), Rate limit awareness (Configuration & gotchas files), Auth clarity (configuration.md), Discoverability (SKILL.md decision trees)

### Implementation Readiness

- ✅ Architecture decisions made for all 4 epics
- ✅ Project structure fully specified with file paths
- ✅ Implementation patterns defined (naming, format, communication, process)
- ✅ Anti-patterns explicitly documented to prevent agent errors
- ✅ Epic-to-file mapping complete
- ✅ Epic dependency graph defined
- ✅ Boundaries between old (server) and new (skill) code explicit
- ✅ Cross-cutting concerns addressed

### Documented Gaps (Explicitly Deferred or Rejected)

1. **AST-based api.md extraction** — Deferred to post-launch backlog. README extraction ships first. Reason: implementation complexity disproportionate to immediate value; README already has TypeScript function signatures.

2. **Pre-commit packaging hook** — Explicitly rejected. Reason: packaging (.skill file) is a CI concern, not a pre-commit concern. Pre-commit checks lint/types; CI handles build/package/distribute.

3. **Bun version pinning** — Explicitly rejected. Reason: install.sh checks for Bun presence, not version. Bun's API stability means pinning is over-engineering for this scope.

### Validation: PASS

The architecture document is complete, coherent, and implementation-ready. No blocking issues identified.
