---
name: mcp-server-trello-release
description: >-
  Canonical build → release → tag → publish procedure for the
  @delorenj/mcp-server-trello repo. Use when cutting a release, bumping the
  version, tagging, or publishing to npm / the MCP registry — triggers:
  "cut a release", "release 1.x.y", "ship a new version", "bump the version",
  "publish to npm", "publish to the MCP registry", "tag the release",
  "how do I release this". Codifies the FOUR version-bearing literals that must
  move in lockstep (package.json, server.json ×2, src/index.ts McpServer info)
  plus CHANGELOG, and the exact GitHub-Actions triggers that make merging a PR
  the publish event. Do NOT use for generic changelog prose (docs-changelog),
  cross-repo semver task scaffolding (mise-versioning), or non-release tagging.
---

# mcp-server-trello-release

The release rules for **`@delorenj/mcp-server-trello`**. This repo publishes to
**two** registries off **automation triggered by a PR merge** — so a release is
not "run publish", it is "get `main` correct and merge the PR". Get the version
parity or the trigger semantics wrong and you desync npm from the MCP registry,
or ship a server that lies about its own version.

> Every fact below was VERIFIED on 2026-07-16 against this repo. The maintainer
> pivots fast — re-check the workflow files and `versionbump.js` before leaning
> on any of it. `llr` is the recency compass.

---

## The one thing that breaks every time: version parity

There are **four** version literals in this repo, not one, plus the changelog.
They must **all** read the same `X.Y.Z` before you open the release PR:

| # | Location | Field | Why it matters |
|---|----------|-------|----------------|
| 1 | `package.json` | `version` | Drives the **npm** publish. |
| 2 | `server.json` | `version` (top level) | Drives the **MCP registry** publish. |
| 3 | `server.json` | `packages[0].version` | Registry cross-checks it against #2 and the npm tarball. |
| 4 | `src/index.ts` | `new McpServer({ version })` (~line 44) | What the server **reports over MCP**. If stale, `tools/list` clients see the wrong version. |
| 5 | `CHANGELOG.md` | newest `## [X.Y.Z] - DATE` heading | Human record + release-notes source. |

**The trap:** `bun run versionbump:{patch,minor,major}` (`scripts/versionbump.js`)
**only edits #1.** It silently leaves #2, #3, #4 behind. That is exactly how
`server.json` drifted to `1.5.6` while npm was on `1.7.1`, and how the McpServer
literal sat at `1.7.1` into a `1.8.0` cut. **Never trust `versionbump` alone.**

Use the bundled helper instead — it sets all four literals at once and flips the
changelog heading:

```bash
.agents/skills/mcp-server-trello-release/scripts/set-version.sh 1.8.0
```

Then always confirm parity before committing:

```bash
.agents/skills/mcp-server-trello-release/scripts/parity-check.sh
```

`parity-check.sh` exits non-zero if any of the five disagree. It is safe to wire
into CI as a release gate.

---

## The trigger map — what publishes, and when (VERIFIED from `.github/workflows/`)

| Workflow | Fires on | Effect |
|----------|----------|--------|
| `ci.yml` | any PR/push to `main` | `bun run test:coverage` — the coverage **ratchet gate**. Must be green or the PR can't merge cleanly. |
| `publish-npm.yml` | PR to `main` **closed AND merged** | `npm publish --provenance` using **`package.json`** version. |
| `publish-registry.yml` | **push to `main`** touching `server.json`/`package.json`, **or** a GitHub **Release** `published` | `mcp-publisher publish` using **`server.json`**. |

Read the consequences carefully — they define the whole procedure:

- **Merging the release PR is the publish event.** The merge closes the PR
  (→ npm publish) *and* pushes the version files to `main` (→ registry publish).
  There is no separate "publish" step and no manual `npm publish`.
- **Release only through a PR merge — never direct-push a bump to `main`.**
  A direct push fires the registry publish (paths match) but **not** the npm
  publish (needs a PR-close event). That desyncs the two registries. Always PR.
- **A raw annotated git tag is side-effect-free.** No workflow triggers on tag
  pushes — only on a GitHub *Release* object. So you can (and must) push
  `vX.Y.Z` after merge with zero risk of a double-publish.
- **Do NOT `gh release create` under the current config.** A GitHub Release
  emits `release: published`, which re-runs `publish-registry.yml` for a version
  already pushed via `main` → a red, duplicate publish. Push the raw tag instead.
  (To make GitHub Releases safe, see *Recommended hardening* below.)

---

## Semver rules for this repo

- **patch** (`x.y.Z`) — bug fix, no surface change.
- **minor** (`x.Y.0`) — new tool, new optional param, additive behavior. Most
  releases here.
- **major** (`X.0.0`) — a breaking change to the **published** tool surface:
  removing/renaming a tool that shipped, or making a previously-optional param
  required. Removing a tool that **never shipped to npm** is *not* breaking
  (that was the `1.8.0` dead-tool cleanup — minor, not major).
- Tool count is a moat concern (selection accuracy degrades past ~20 tools). A
  release that *removes* a tool is healthy; note it in the changelog `Removed`.

---

## The procedure

### Phase 0 — Preflight (on a release branch, never on `main`)
```bash
git branch --show-current            # must NOT be main
git status --short                   # must be clean
```

### Phase 1 — Set the version everywhere
```bash
scripts/set-version.sh <X.Y.Z>       # writes literals 1–4 and flips the changelog heading
```
> Or by hand: edit `package.json`, both `server.json` fields, the `McpServer`
> literal in `src/index.ts`, and the changelog heading. Then run parity-check.

### Phase 2 — Finish the changelog
`set-version.sh` turns `## [Unreleased]` into `## [X.Y.Z] - <today>`. Fill in the
`Added` / `Changed` / `Fixed` / `Removed` bullets (Keep a Changelog format).
Get today's date from `date +%F`.

### Phase 3 — Gates (mirror CI locally, in order)
```bash
scripts/parity-check.sh              # all 5 versions agree
npm run typecheck                    # 0 errors (guards the zod v4 / SDK types path)
npm run test:coverage                # green; autoUpdate may ratchet vitest.config.ts — COMMIT that bump
npm run build                        # bun build succeeds
# stdio smoke: server boots and lists the expected tool count
```

### Phase 4 — Commit
```bash
git add -A && git commit -m "chore(release): <X.Y.Z>"
```
Keep the version files + the ratcheted `vitest.config.ts` in this commit.

### Phase 5 — Open the PR
```bash
git push -u origin <branch>
gh pr create --base main --title "Release <X.Y.Z>: <headline>" --body-file <notes>
```
State in the PR body that **merging publishes** (npm + registry). Wait for
`ci.yml` (the coverage gate) to go green.

### Phase 6 — Merge = publish
Merge the PR. This auto-fires `publish-npm.yml` and `publish-registry.yml`.
Watch both Actions runs to green before declaring the release done.

### Phase 7 — Tag (after merge, on `main`)
```bash
git checkout main && git pull
git tag -a v<X.Y.Z> -m "v<X.Y.Z>"    # annotated; message can carry the changelog highlights
git push origin v<X.Y.Z>             # raw tag push — no workflow side effects
```
This repo's tags stopped at `v1.6.1` (1.7.0/1.7.1 shipped untagged). **From now
on, every release gets an annotated `vX.Y.Z` tag.**

### Phase 8 — Verify
```bash
npm view @delorenj/mcp-server-trello version            # == X.Y.Z
git ls-remote --tags origin | grep v<X.Y.Z>             # tag present
gh run list --workflow=publish-npm.yml --limit 1        # green
gh run list --workflow=publish-registry.yml --limit 1   # green
```
Optionally confirm the MCP registry entry updated at
`https://registry.modelcontextprotocol.io` for `io.github.delorenj/mcp-server-trello`.

---

## Recommended hardening (not required; each removes a footgun)

1. **Fix `versionbump.js`** to also write `server.json` (both fields) and the
   `src/index.ts` `McpServer` literal — or, better, make `src/index.ts` **derive
   its version from `package.json` at runtime** so literal #4 can never drift
   again. (Mind the bundling: `bun build --target node` inlines `src/`; read the
   package's own `package.json` by resolved path, not a bare `require`.)
2. **Add `parity-check.sh` as a CI step** on PRs to `main`, so a mismatched
   release can't merge.
3. **Move to tag-driven publishing.** Change `publish-npm.yml` /
   `publish-registry.yml` to trigger on `push: tags: ['v*']` and drop the
   merge/paths triggers. Then the tag becomes the single release truth and
   `gh release create` (with auto-generated notes) becomes safe and idempotent.

---

## When a publish fails (triage)

Both publish workflows can go red even when the code is perfect. The failures
**chain from a single root cause**, so read them in order:

- **`publish-npm.yml` → `npm error code E404` on the `PUT`.** The tarball built
  fine — this is **auth, not packaging.** npm masks an invalid / expired /
  under-permissioned token as a `404 Not Found` on an *existing* package (it
  won't admit the package exists to a caller it can't authorize). Root cause is
  almost always the **`NPM_TOKEN` GitHub secret**: npm tokens expire, and once
  the automation/granular token lapses, *every* publish 404s until it's rotated.
  This is what silently caused the 7-month release gap — not the `bin`/`files`
  allowlist theory (the CI tarball proves `src/index.ts`, `package.json`,
  `README`, `LICENSE`, and `build/index.js` all ship correctly).
  **Fix:** as a package owner (`npm owner ls @delorenj/mcp-server-trello`),
  mint a fresh token on npmjs.com with **write** access to the `@delorenj`
  **org** scope (it's an org scope, not a user scope — grant the org, not just
  the package), `gh secret set NPM_TOKEN`, then `gh run rerun <npm-run-id>`.
  A local `npm publish` by the owner also works but loses CI provenance.
- **`publish-registry.yml` → 400 `"version 'X.Y.Z' was not found (status 404)
  … publish version 'X.Y.Z' before registering it"`.** This is **downstream, not
  a registry bug** — the MCP registry validates that the npm version already
  exists before it will register the server entry. It fails simply because the
  npm publish above didn't land. **Fix npm first, then** re-run this job:
  `gh run rerun <registry-run-id>`.

**One root cause (npm auth), two red workflows.** Fix npm → re-run npm → re-run
registry. Never chase the registry error in isolation.

## Anti-patterns (each has bitten this repo)

- Running `versionbump` and assuming the release is versioned. → #2/#3/#4 drift.
- Editing `package.json` but forgetting `server.json`. → registry ships stale metadata.
- Bumping the version but not `src/index.ts`. → server reports the wrong version to every client.
- `gh release create` under the current workflows. → duplicate/red registry publish.
- Direct-pushing a bump to `main`. → registry publishes, npm doesn't; the two desync.
- Cutting a release with red/absent `ci.yml` coverage. → merge blocked or main goes red.
