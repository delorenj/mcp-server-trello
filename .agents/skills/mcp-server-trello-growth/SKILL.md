---
name: mcp-server-trello-growth
description: >-
  Distribution-first growth ledger for @delorenj/mcp-server-trello — grow reach
  now, defer (but record) monetization. Use for questions about distribution,
  reach, growth, adoption, downloads, stars, marketplace listings (Smithery,
  Claude marketplace / directory, Trello Power-Up marketplace), the onboarding
  funnel (key+token vs OAuth), npm discoverability, and "how do I grow this",
  "where do MCP installs come from". Also holds the PARKED monetization thesis —
  monetization, pricing, open-core, GitHub Sponsors, Team/Pro waitlist, "should
  I charge for this", "the server that remembers". Current stance:
  **DISTRIBUTION FIRST — monetization deferred/recorded** (a bet with an
  explicit build-trigger, NOT built). Do NOT use for product / tool-surface
  decisions (mcp-server-trello-product-doctrine), the release/publish procedure
  (mcp-server-trello-release), or architecture / craft judgment
  (mcp-server-trello-craft-doctrine).
---

# mcp-server-trello-growth

The **growth ledger** for **`@delorenj/mcp-server-trello`**. The maintainer made
one strategic choice explicitly: **distribution first — grow reach before
revenue.** This skill records that near-term reach work (Phase 1, *do now*) and
**parks** the monetization thesis as a deferred, written-down bet (Phase 2,
*recorded, not built*). It exists so the money idea is captured without being
acted on, and so the reach work is gated and verifiable rather than vibes.

> **This skill runs on the same epistemic contract as the rest of the house.**
> Every factual claim carries exactly one marker: **VERIFIED** (a command was
> run *this session* and the output cited), **BELIEVED** (plausible, unchecked —
> may **never** justify a spend on its own), or **FALSIFIED**. The "VERIFIED"
> facts below were true on **2026-07-21**; the maintainer pivots fast — **re-run
> the commands before you lean on any of them.** `llr` is the recency compass.

---

## What changed on 2026-07-21 (why reach work is worth doing *now*)

> **VERIFIED this session.** After a **7-month release gap** (npm sat on 1.7.1
> from 2025-12-18), **1.8.0 shipped to both registries**:
>
> - npm `latest = 1.8.0`, `time.modified = 2026-07-21T03:08Z`, published via
>   Trusted Publishing / OIDC (tokenless) —
>   `npm view @delorenj/mcp-server-trello version dist-tags.latest time.modified`
> - MCP registry `io.github.delorenj/mcp-server-trello @ 1.8.0`, `isLatest: true`
>   — `curl "https://registry.modelcontextprotocol.io/v0/servers?search=mcp-server-trello"`

This is the unlock for growth, for three reasons:

1. **New installs finally run current code.** For 7 months every new install ran
   December's binary; 30+ merged PRs were invisible. Distribution work was
   *pointless* while the package was stale — you'd be funnelling people to a
   frozen build. Now it isn't.
2. **The tracker's contamination should start to clear.** Issues that requested
   features which already existed (artifacts of the release gap) can now be
   closed as shipped, not chased as demand.
3. **The funnel is worth widening only once the thing at the end works.** Fixing
   a broken discovery channel that leads to a 7-month-old package is negative
   ROI. Post-1.8.0 it's positive.

> **Say this first in any growth conversation, until it's false: the release gap
> is closed. Before 2026-07-21, "grow reach" was premature. After it, it's the
> live priority.**

---

## Segment the tracker BEFORE inferring demand (non-negotiable)

Per TheGardner: **the issue tracker is a contaminated instrument.** A 7-month
publish failure means an unknown fraction of open issues measure *"the package
was broken/stale,"* not *"users want this."* Do not read a raw issue count as
demand.

- **Segment pre/post-1.7.1** (the release-gap cohort), **and now pre/post-1.8.0**
  (the just-shipped cohort). Complaints filed against a stale package are not
  evidence about the current one.
- **Open ≠ unresolved.** Live example (VERIFIED this session): **#2 "NPM package
  doesn't exist" is still OPEN**, yet `npm view` returns `1.8.0`. The underlying
  claim is **FALSIFIED** — the package plainly exists. The issue is just
  *unclosed*, and counting it as demand would be double-counting a fixed bug.
- **Never fabricate demand, download counts, or user quotes.** Cite behavior
  (a third party hand-assembling the loop, repeated PRs, a *daily* user's issue)
  or cite Atlassian's documented gap — and say which. "Every dev wants this" is
  not a data point.

---

# PHASE 1 — DISTRIBUTION (do now)

Base to grow from, **VERIFIED this session**:

| Metric | Value | Command |
|--------|-------|---------|
| npm downloads, last 30d | **8,882** (2026-06-21→07-20) | `curl "https://api.npmjs.org/downloads/point/last-month/@delorenj/mcp-server-trello"` |
| GitHub stars / forks | **423 / 139** | `gh repo view delorenj/mcp-server-trello --json stargazerCount,forkCount` |
| npm `latest` | **1.8.0** | `npm view @delorenj/mcp-server-trello version` |

> The often-quoted **~70k is cumulative downloads — a vanity number.** The rate
> that actually reflects reach is **~8.9k/month** (VERIFIED above; close to the
> ~9.3k BELIEVED in TheGardner 2026-07-16 — now re-confirmed). Track the *rate*,
> the *stars trend*, and — new post-1.8.0 — the *share of installs on the current
> major*. Do not celebrate the cumulative counter.

## The reach moves — a gated ledger

Issue numbers come from TheGardner (dated 2026-07-16) and are **BELIEVED** there;
their **OPEN state was re-VERIFIED this session** (`gh issue view`), but an open
state is not proof the underlying problem persists (see #2 above). Re-read each
issue body before acting.

| # | Move | Why it grows reach | First action | Gate / risk | How to VERIFY it's actually fixed |
|---|------|--------------------|--------------|-------------|-----------------------------------|
| 1 | **Smithery listing (#47)** | A *broken* discovery channel is **negative** reach — it advertises a dead install. Highest-priority funnel fix. | Reproduce the documented Smithery install end-to-end; find where it breaks (build config, `smithery.yaml`/metadata, or a stale version pin). | Don't "fix" blind — the break mechanism is **BELIEVED**, unconfirmed. Confirm the failure first. | Run the Smithery install flow to a **booted server that lists the 1.8.0 tool count over stdio**. Not "the page loads" — the *install* must succeed. |
| 2 | **Claude marketplace / directory (#70)** | A large and growing share of MCP demand now originates in-client. Absent = invisible to that whole channel. **BELIEVED** (share unquantified) — but low-regret to list. | Submit/enable the directory listing per Anthropic's current process; point it at 1.8.0. | Listing metadata drifts from the package — a listing pinned to an old version re-creates the stale-install problem. | Confirm the entry resolves and its advertised version **== `npm view … version`** (1.8.0). Re-check on each release. |
| 3 | **Trello Power-Up marketplace (#39)** | **Trello-native** discovery — a channel npm-only competitors structurally don't have. Meets users where the board already is. | Scope a Power-Up entry via the Trello developer portal; decide what it *links to* (install/docs), since the server is stdio, not a hosted Power-Up. | Highest effort of the five; needs a Trello dev-portal submission + review. Don't start until #47/#70 (cheaper) are done. | Find the Power-Up in Trello's in-product directory search and complete an install→docs handoff. |
| 4 | **Onboarding funnel (#21)** | **key+token is a strictly worse funnel than OAuth consent.** TheGardner: *"the moat's benefit is claimed, its cost never booked."* Every extra manual step is top-of-funnel leakage. **BELIEVED** the friction costs conversions — measure it. | Time a **cold-start**: fresh user → first successful tool call. Count steps and dead-ends (where does #21's "stuck at auth" happen?). | The locality moat *depends* on local key+token (no cloud OAuth round-trip). Reducing friction ≠ abandoning it — improve the docs/first-run path, don't propose cloud OAuth here. | Re-time the cold-start after the change; step count and time-to-first-call must drop. Watch for new #21-class "stuck at auth" reports. |
| 5 | **npm discoverability (#2, historical)** | Keywords + an above-the-fold README pitch decide whether npm search surfaces you and whether a visitor installs. Cheapest lever of all. | Add the **"why this over the official Atlassian one"** pitch above the fold (judgment/workflow encapsulation, not endpoint count). Tighten keywords. | #2's literal complaint is **FALSIFIED** (package exists). Don't reopen a fixed bug; treat #2 as a discoverability prompt, not a live defect. | `npm view … keywords description` reflects the new pitch; the README's first screen answers "why not the official one?"; search "trello mcp" and note the rank moved. |

### Where each move stands, grounded

- **npm keywords today (VERIFIED, `npm view … keywords description`):**
  `mcp, trello, bun, automation, productivity, model-context-protocol, api,
  integration, typescript, board-management, task-management, kanban`. The
  description is *"An MCP server for Trello boards, powered by Bun for maximum
  performance."* — it sells **speed**, not **judgment**. The moat is opinionated
  workflow encapsulation; the above-the-fold pitch should say so. (Move 5.)
- **Competitive framing for Move 5 (BELIEVED, from TheGardner):** we're the
  **incumbent** — 422★ vs 35/34/3 for the nearest 1:1-mapping servers; Composio
  ships ~329 tools (16× past the selection cliff). The official Trello MCP
  (`mcp.trello.com/v1`) is a cloud OAuth endpoint with **no filesystem, cwd, or
  git** — the locality gap is the pitch. Re-verify star/tool counts before
  quoting them in public copy.

---

# PHASE 2 — MONETIZATION THESIS (recorded, NOT built)

This is a **parked hypothesis with an explicit build-trigger.** Under the
distribution-first choice, **nothing in this phase gets built or even
instrumented yet.** It is written down so it isn't lost, and gated so it isn't
acted on prematurely.

## The open-core seam

Read the **locality moat** from the money side and it splits cleanly:

- **OSS (MIT) — the local writer + local interpreter.** git, cwd, filesystem,
  private, no OAuth round-trip. This is the moat *nobody can take* — a cloud
  OAuth server (`mcp.trello.com/v1`) structurally cannot reach a filesystem or a
  repo. **Keep this MIT. Forever.**
- **PAID — the layer stdio structurally *cannot be*.** State that **outlives a
  session**; a **readable back-channel** that finally closes the inert `watch_*`
  loop (today `watch_card`/`watch_list` set `subscribed:true` into a Trello inbox
  **this server cannot read** — the write half of a loop with no read half — and
  *"stdio has nowhere to put the cursor"*); a **team-shared corpus**; history
  **beyond the stdio window**; hosted flow dashboards. Call it
  **"the server that remembers."**

## Why it's not a rug-pull

You are **not** fencing off code that was free. The server stays MIT. The paid
thing is a **separate product** selling a **topology the OSS never had** —
persistence, a read-back channel, shared state, hosting. That is the *same
locality moat read from the money side*: OSS owns "local, private, yours"; paid
owns "durable, shared, hosted." Selling a capability the free version never
possessed is not a bait-and-switch.

## The build-trigger (the gate — do NOT cross it yet)

Do **not** build or instrument Phase 2 until **both** hold:

1. **Reach is materially larger** than the 2026-07-21 base (~8.9k downloads/mo,
   423★). Distribution first means this comes *before* any monetization signal.
2. **Demand is MEASURED, not assumed** — via low-regret instruments, not a built
   product.

**Future low-regret instruments (listed, explicitly NOT to be set up now):**

- **GitHub Sponsors** — the lowest-regret willingness-to-pay signal. *(VERIFIED
  this session: no `.github/FUNDING.yml` exists — Sponsors is not configured, and
  under distribution-first it stays that way for now.)*
- **A Team/Pro waitlist** as a *real instrument* — a landing page that measures
  intent, not a product. A signup is a behavioral signal; a survey answer is not.

> **Rule: no Sponsors, no waitlist, no FUNDING.yml, no pricing page until Phase 1
> has moved the reach numbers AND one of these instruments shows real signal.
> Recording the thesis is this skill's job; building it is a later decision.**

## The precedent that de-risks it (BELIEVED — from TheGardner, recheck)

**Corrello and Nave already CHARGE** for Trello board analytics as Power-Ups —
cycle time, WIP age, dwell distributions. That is TheGardner's **#1 vein**
(*"interpretation of the transition log"*) with **proven willingness-to-pay** in
the exact market. It is **BELIEVED-from-TheGardner (dated 2026-07-16)** — confirm
both products still exist and still charge before citing this to justify a build.
Note the shape: they sell *interpretation of ambient data*, which is precisely
what stdio-plus-persistence ("the server that remembers") would own and what
Trello ships natively **nowhere**.

---

## Anti-patterns (each would burn reach or violate the choice)

- **Funnelling installs to a stale package.** The pre-2026-07-21 mistake. Never
  promote a discovery channel whose endpoint is an old build — verify `npm view …
  version` == the intended major first.
- **Inferring demand from a raw issue count.** Segment pre/post-1.7.1 and
  pre/post-1.8.0 first. #2 is the standing proof an *open* issue can be a *fixed*
  bug.
- **Quoting the ~70k cumulative number as growth.** It's a vanity total; track
  the ~8.9k/mo *rate* and the star trend.
- **"Fixing" #47 blind.** The Smithery break mechanism is BELIEVED — reproduce it
  before changing config, or you fix the wrong thing and still ship a dead
  install.
- **Building Phase 2 (or setting up Sponsors / a waitlist / FUNDING.yml) now.**
  The maintainer chose distribution first. Phase 2 is recorded, gated, and
  untouched until the build-trigger fires.
- **Framing the paid product as gating the OSS.** It sells a topology the OSS
  never had; keep the server MIT and say so, or the "not a rug-pull" claim
  collapses.
