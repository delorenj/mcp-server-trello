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
| `publish-npm.yml` | PR to `main` **closed AND merged**, **or** manual **`workflow_dispatch`** | `npm publish` via **Trusted Publishing (OIDC)** using **`package.json`** version. **No `NPM_TOKEN`** — auth is the workflow's OIDC `id-token`; provenance is generated automatically. |
| `publish-registry.yml` | **push to `main`** touching `server.json`/`package.json`, **or** a GitHub **Release** `published` | `mcp-publisher publish` (also OIDC, `github-oidc` login) using **`server.json`**. |

> **Publishing is tokenless (Trusted Publishing / OIDC), since 2026-07.** npm's
> package settings list `delorenj / mcp-server-trello / publish-npm.yml` as a
> trusted publisher, so CI mints a short-lived OIDC token per run instead of a
> stored secret. This replaced the `NPM_TOKEN` path, which npm is deprecating:
> 2FA-bypass tokens lose sensitive actions ~Aug 2026 and direct publish ~Jan
> 2027. Requirements the workflow must keep satisfying: **`id-token: write`**,
> **npm CLI ≥ 11.5.1** (we `npm install -g npm@latest`), **Node ≥ 22.14.0**, and
> **no `NODE_AUTH_TOKEN`**. The trusted-publisher config fields are
> **case-sensitive and exact** — org `delorenj`, repo `mcp-server-trello`,
> workflow filename `publish-npm.yml` (no path, keep the `.yml`), environment
> blank.

Read the consequences carefully — they define the whole procedure:

- **Merging the release PR is the publish event.** The merge closes the PR
  (→ npm publish) *and* pushes the version files to `main` (→ registry publish).
  There is no separate "publish" step and no local `npm publish`.
- **`workflow_dispatch` is the re-publish escape hatch.** If the npm job fails
  for an infra reason (a bad CI run, a first-time trusted-publisher config), fix
  it and re-run `publish-npm.yml` directly on `main` — `gh workflow run
  publish-npm.yml` — instead of re-merging. It publishes whatever version
  `package.json` on `main` currently declares. (npm rejects a re-publish of an
  already-published version, so this is safe to retry.)
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

Both publish workflows can go red even when the code is perfect. The npm and
registry failures usually **chain from one root cause**, so read them in order.

**npm side (`publish-npm.yml`), Trusted-Publishing era:**

- **`Unable to authenticate` / `unable to find a trusted publisher` / OIDC
  mismatch.** The OIDC identity CI presented didn't match npm's trusted-publisher
  record. The fields are **case-sensitive and exact** — re-check on npmjs.com
  (package → Settings → Trusted Publisher): org `delorenj`, repo
  `mcp-server-trello`, workflow filename `publish-npm.yml` (filename only, keep
  `.yml`, no path), environment **blank** (the workflow declares no
  `environment:`). A rename of the workflow file, or setting a GitHub
  environment without adding it here, breaks the match.
- **`npm error This command requires npm version 11.5.1 or greater` / OIDC not
  attempted.** The runner's npm is too old or Node is < 22.14.0. The workflow
  must keep `node-version: '22.x'` **and** the `npm install -g npm@latest` step,
  and the job must keep `permissions: id-token: write`. If any of those regress,
  npm silently falls back to token auth and fails.
- **`EOTP` / `E404` on the `PUT`** — *historical, pre-2026-07.* These were the
  **stored-`NPM_TOKEN`** failure modes (`E404` = expired/under-scoped token, npm
  masks bad auth as 404; `EOTP` = the token type still demanded a 2FA one-time
  password CI can't supply). Trusted Publishing removed the token entirely, so
  these should not recur. If you see them, someone re-introduced
  `NODE_AUTH_TOKEN` / `NPM_TOKEN` into the workflow — remove it; OIDC is the auth.
- **Re-running after a fix:** trusted-publisher config changes take effect
  immediately (no re-mint). Re-publish with `gh workflow run publish-npm.yml`
  (dispatch on `main`) rather than re-merging.

**registry side (`publish-registry.yml`):**

- **400 `"version 'X.Y.Z' was not found (status 404) … publish version 'X.Y.Z'
  before registering it"`.** **Downstream, not a registry bug** — the MCP
  registry validates that the npm version already exists before registering the
  server entry. It fails only because the npm publish above hasn't landed. **Fix
  npm first, then** re-run: `gh run rerun <registry-run-id>`.

**Fix npm → confirm `npm view … version` == X.Y.Z → re-run registry.** Never
chase the registry error in isolation.

## Anti-patterns (each has bitten this repo)

- Running `versionbump` and assuming the release is versioned. → #2/#3/#4 drift.
- Editing `package.json` but forgetting `server.json`. → registry ships stale metadata.
- Bumping the version but not `src/index.ts`. → server reports the wrong version to every client.
- `gh release create` under the current workflows. → duplicate/red registry publish.
- Direct-pushing a bump to `main`. → registry publishes, npm doesn't; the two desync.
- Cutting a release with red/absent `ci.yml` coverage. → merge blocked or main goes red.
- **Naming a `package.json` script after an npm lifecycle event** (`publish`,
  `prepare`, `pack`, `version`, …). The repo shipped `"publish": "bun run build
  && npm publish"`; because `publish` is a lifecycle hook, CI's `npm publish`
  re-invoked it → a **recursive second publish** that `E403`'d ("cannot publish
  over previously published X.Y.Z") and **false-red'd every successful release**.
  It was masked for months only because auth failed on the *first* publish. Fixed
  2026-07-20 by renaming it to **`release`**. Local publish is now `npm run release`.
- **Reading a green `publish-npm` run as proof a publish happened.** The publish
  steps now self-skip an already-published version (guard → clean `exit 0`, still
  green). Green means "npm/registry is at the package's declared version," not
  "we uploaded just now." Always confirm the actual bytes with
  `npm view @delorenj/mcp-server-trello version`.
