---
name: mcp-server-trello-product-doctrine
description: >-
  The versioned single source of truth for the PRODUCT doctrine of
  @delorenj/mcp-server-trello — what this server should become, and why it
  beats a 1:1 endpoint wrapper. Use to evaluate a feature idea / issue / PR
  against the doctrine, decide what ships next, kill a tempting-but-empty idea,
  audit the tool surface for slot cost, or answer "what should this server
  become". Triggers: opinionated workflow encapsulation, judgment made reusable,
  ceiling vs floor, the moat, slot ledger, the five gates, the tiered roadmap,
  "does this raise the ceiling", "should we ship this tool", "what's the moat
  against Atlassian's Trello MCP". This skill is the SSOT that BOTH the
  `TheGardner` product agent and the `pr-crusher` release-gate agent yield to;
  if it changes, they change with it. Do NOT use for: writing the code (that's
  implementation), merging/gating PRs (that's the pr-crusher agent), the build →
  release → tag → publish procedure (that's mcp-server-trello-release), or
  code-craft / architecture judgment (that's mcp-server-trello-craft-doctrine).
---

# mcp-server-trello — Product Doctrine (SSOT)

The product thesis of **`@delorenj/mcp-server-trello`**: the durable rules for
what belongs in this server and what does not. This file is the **single source
of truth**. The `TheGardner` product agent and the `pr-crusher` release gate
both reference it and **yield to it** — when the doctrine here changes, their
behavior changes with it. They hold personas and workflows; this holds the
thesis.

> Facts below were VERIFIED on **2026-07-16**, with one block re-verified
> **2026-07-21** (the 1.8.0 ship — see *Ground truth*). The maintainer pivots
> hard and fast; his own guidance is *"take any and all docs with a grain of
> salt."* This is a doc. **Re-run the commands before you lean on them.**
> Recency is the confidence compass: `fdfind --type f --hidden --exclude .git
> -X ls -lt --time=ctime -r`.

---

## Why this doctrine exists (the structural asymmetry)

The maintainer can't fix this by working harder: **the inbound PR flow
structurally cannot produce ceiling work.** Contributors see the API surface;
they can't see the product thesis. So they send `update_list`, `dueReminder`,
`watch_card`, custom fields — one more endpoint each, forever. Of the registered
tools, roughly five encode any judgment at all. `pr-crusher` is the **gate** on
what arrives. This doctrine is the **source** of what should exist. Nobody else
is going to build the ceiling.

This is not a hype document. Motivation makes the job *harder*, not easier —
motivated people ship the flattering idea. The value is in what gets **killed**.
In the research that produced this doctrine, 81 candidate tools were generated
and every single one was ceiling-shaped; the good ones died anyway, on gates
that come *before* the North Star. **Bring an idea's corpse, not its brochure.**

---

## The epistemic contract (read this before you believe anything below)

The research that produced this doctrine asserted things it never checked, in
the same confident register as things it proved. It claimed `/search` was a
permanent moat *while its own inputs said Atlassian ships search today.* It
invented a user persona and let it kill an entire territory. **You will do this
too unless you mark your claims.**

Every factual claim carries exactly one marker:

- **VERIFIED** — a command was run, this session, and the output pasted. Cite it.
- **BELIEVED** — plausible, load-bearing, unchecked. Say so out loud. **A
  BELIEVED claim may never kill an idea.**
- **FALSIFIED** — checked and false. Recorded below so nobody relitigates it.

> **Rule: if a claim is doing real work in a decision, it must be VERIFIED
> before the decision lands — not after. Verify before you kill.**

---

## The North Star (inherited, not invented — this skill is now its SSOT)

Shared verbatim with the `pr-crusher` agent. Historically `pr-crusher.md` held
the canonical copy; **going forward THIS SKILL is the SSOT** both `TheGardner`
and `pr-crusher` yield to. If it changes, it changes here first.

> The maintainer's moat is **opinionated workflow encapsulation over bland 1:1
> interface mapping.**
> `getCheckboxItemDependencies()` ≫ `getCard()`
> `getCard()` is a passthrough (widens the **floor** of what's exposed).
> `getCheckboxItemDependencies()` is **judgment made reusable** — it encodes a
> workflow once, correctly, for everyone (raises the **ceiling**).

**Ceiling is necessary and nowhere near sufficient.** It is the *tiebreaker*,
not the first question. Everything that died in research was already
ceiling-shaped. **Run the gates first.**

---

## Ground truth (VERIFIED 2026-07-16; release block re-verified 2026-07-21 — re-check before leaning)

> ⚠️ **This whole block is overdue for a re-verification pass.** A release
> landed on 2026-07-21 (below), which invalidates the "release gap" framing and
> may have moved download counts, the issue tracker, and the tool surface. The
> tool counts, download numbers, and line numbers below are carried forward
> **unchanged from the 2026-07-16 check** and were NOT re-verified this session.
> Re-run the commands before quoting any of them.

### The release gap WAS the whole context — now CLOSED (VERIFIED 2026-07-21)

**Historical:** npm `latest` sat at **1.7.1, published 2025-12-18**, for **seven
months**. `git tag` stopped at **v1.6.1** (1.7.0 and 1.7.1 shipped untagged).
Every download ran December's code; 30+ merged PRs were invisible to all of
them. Issue #95 was the open release request. The `package.json` `bin` /
`files` mismatch was the BELIEVED publish blocker.

**1.8.0 SHIPPED on 2026-07-21.** VERIFIED this session:
- npm `@delorenj/mcp-server-trello` `latest` is now **1.8.0** (was 1.7.1 for
  seven months), published via **Trusted Publishing (OIDC)** — the release
  pipeline is now **tokenless** (no `NPM_TOKEN`).
- The MCP registry entry `io.github.delorenj/mcp-server-trello` is now **1.8.0,
  `isLatest: true`**.
- **`v1.8.0` is tagged.**

> **The Tier 0 release gate is CLOSED. The clause that used to lead every
> roadmap conversation — *"every ceiling tool is worth exactly zero until 1.8.0
> ships; say it first, every time"* — is RETIRED. For the first time, ceiling
> work is worth NON-ZERO: a fix you ship can now actually reach users.**
>
> **The new first thing to verify is ADOPTION, not release.** Are the ~9.3k
> downloads/month now actually running 1.8.0's code? And has the issue tracker's
> "contaminated instrument" problem — features requested that already shipped
> (#37/#31/#30/#38 were artifacts of the 7-month gap) — started to **clear** now
> that a release finally landed? Verify adoption is real before betting the
> roadmap on it; don't assume the audience upgraded the day of.

### The quality apparatus WAS dead — fixed 2026-07-16 on `fix/typecheck-and-dead-tools`. Keep the lesson.
- Root cause of the OOM (`tsc` died at 4GB, still dead at 8GB/143s): the SDK
  types its schemas against `zod/v4`, but src imported bare `'zod'` — the v3 API
  in zod 3.25.x. Reconciling v3 schemas against v4 core types made `registerTool`
  inference explode (**TS2589**). Importing `zod/v4` → **604ms, flat.** *If you
  ever add a tool and tsc starts crawling, this is the first thing to check.*
- **What the resurrected typecheck immediately caught — the argument for Tier 0
  in one screen:** 14 errors that had been invisible, including **four registered
  tools calling `TrelloClient` methods that do not exist** (`get_card_attachments`,
  `get_card_checklists`, `search_labels`, `remove_label_from_card` — all
  `TypeError` on first call, added in PRs #99/#100 and merged with no typecheck to
  catch them). All four dropped. **This is the standing proof that a dead gate
  doesn't just miss bugs — it lets the passthrough-adding PR flow ship *broken*
  passthroughs.**
- Coverage is ~22% lines — and *tests passed the whole time these four tools were
  dead*, because the tests exercise the module functions, never the tool wiring.
  **Coverage of the wrong surface is worse than no coverage: it buys false
  confidence.** A ceiling tool ships with an eval that drives it end-to-end, or it
  doesn't ship.

### The tool surface
- **57 `registerTool` calls** as of 2026-07-16 (was 61; four dead tools removed).
  `grep -c "registerTool(" src/index.ts`. **This is a live number — a release has
  landed since; re-count before quoting.**
- Measured selection cliff is **~20 tools (95%→71% accuracy)** — BELIEVED,
  borrowed from published GitHub-MCP numbers, **never measured on this repo.**
  Measuring the real `tools/list` payload is a one-command experiment nobody has
  run. Do it before quoting the number again.
- **Issue #50: Perplexity caps at 20 tools — this server is unusable there
  today.** VERIFIED as an open issue. That one is *ours*, not borrowed.
- **Not one of 81 proposed tools retired anything.**

### The crown jewel is two lines and it lies
```ts
// trello-client.ts:796
async getAcceptanceCriteria(cardId?, boardId?) {
  return this.getChecklistItems('Acceptance Criteria', cardId, boardId);
}
```
The entire judgment is a **hardcoded string literal**, matched by
case-insensitive *exact equality*. It returns `[]` on every board that writes
"AC", "DoD", or "Definition of Done" — **and never says why.** No competitor has
any AC concept at all. **This is the highest value-per-line change available in
the repo.**

### The vein nobody has touched
- `grep -rn "listBefore\|listAfter" src/` → **zero hits.** `data.listBefore`/
  `listAfter` is on every card-move action. It is the **only honest witness to
  movement** — and the server fetches it on every `get_card_history` call and
  throws it away.
- `dateLastActivity` **lies**: comments, label edits, and due-date tweaks all
  bump it. The card three people argued about for nine days looks like the
  freshest card on the board.
- `GET /boards/{id}/cards` is **not wired**. A board sweep today is `getLists` +
  N×`getCardsByList`.
- The checklist card-vs-board fork is copy-pasted **4× verbatim** (client:674/
  716/761/809) and all four **bypass `handleRequest`**.
- `formatCardAsMarkdown` (client:881, ~155 lines) is **buried behind
  `includeMarkdown:false`** on a tool named `get_card`, undocumented everywhere.
- Only **one** tool shapes its response (`get_cards_by_list_id` →
  `formatCardListResponse`). Every other tool `JSON.stringify`s raw Trello JSON
  straight into the model's context.

### A shipped crash in the precedent everyone wants to extend
VERIFIED by reproduction: `trello-client.ts:354` runs `card.name.toLowerCase()`
inside `getCardsByList`'s `nameFilter` — on a field the caller's own `fields`
param may have just excluded. `fields:"id,due"` + any `nameFilter` →
**`TypeError: undefined is not an object (evaluating 'card.name.toLowerCase')`.**
The test at `tests/get-cards-name-filter.test.ts:137` *does* pass `fields` — but
passes `fields:'name,idList'`, which **includes** `name`, so it never walks the
crash path. `tsc` would not catch this one; only a test would. **Any new filter
param must force its own field into `fields`, or it reproduces this bug** — which
is also `get_acceptance_criteria`'s bug wearing a different hat: *filtering on
data you didn't fetch, then failing quietly or loudly instead of saying why.*

### A real security gap
`validateWorkspaceAccess` is defined at `trello-client.ts:171` and called at
**only :197, :297, :327** — `setActiveWorkspace`, `createBoard`,
`listBoardsInWorkspace`. **Zero card or list mutations check it.**
`TRELLO_ALLOWED_WORKSPACES` filters *listings* and gates *nothing that writes*.
Any `cardId` works regardless of workspace. Every flagship on the roadmap is a
writer. **Nobody has priced the blast radius of a hallucinated cardId.**

---

## The gates — run in order. 1–3 are kill shots.

### GATE 1 — The Convention Test *(this is the one that kills)*

> **Does the data this tool reads exist on a live board right now, written by
> nobody, unprompted?**

- **Ambient** — Trello writes it whether or not anyone cooperates: transitions
  (`listBefore`/`listAfter`), `dateLastActivity`, lists, labels, members,
  checklists. **Works on run one, on every board, forever.** → proceed.
- **Convened** — exists only if a human sustained a discipline: `Blocked By`
  checklists holding card links, `Trello-Card:` commit trailers, lease
  envelopes, `ExternalId` fields. → **Name the tool that writes it. If the
  answer is "the user, if they adopt this" — stop.**

VERIFIED on this repo: **300 commits, zero `trello.com/c/` links, zero
`Trello-Card:` trailers.** The maintainer's real dependency graph lives in
`_bmad-output/…/architecture.md` as *prose*. He does not eat this dogfood when
he has an actual graph to maintain.

So `get_card_dependencies`, `find_startable_cards`, `reconcile_board_with_git`,
`derive_release_notes`, `get_critical_path`, and the whole checkpoint/lease
family **return empty on run one, on every board on earth, including his.** That
is not an uncontested niche. **That is an empty room with a moat around it.**

`get_acceptance_criteria` works because **people already named the checklist
that.** The convention was *discovered*, then cashed in for two lines.
Descriptive conventions are free. Prescriptive ones are a bet.

> **Rule: never ship a reader for a convention you can't point at on a live
> board. Ship the writer that creates it as a byproduct of work the agent
> already does — then the reader becomes possible.**

**Smells:** *"nobody does this, which is exactly the point"* (empty ≠ unmet —
sometimes the room is empty because those people left for Jira). The pitch cites
an Atlassian **support doc** as proof of a convention (that doc is an admission
they didn't ship the feature). The tool's graceful-degradation path is its
**modal** outcome — that's not honest degradation, that's a lecture with a
return type.

### GATE 2 — The Loop Test

> **If it reads, who writes? If it writes, who reads?**

`watch_card`/`watch_list` set `subscribed:true`, routing events to a Trello
notification inbox **this server cannot read**. The write half of a loop with no
read half.

**Half a loop is worth zero. Ship pairs or ship nothing.** If only one half can
ship, ship the **writer** — writers create the corpus readers need; readers
create nothing.

*Caveat you must hold:* the research called `watch_card`'s mailbox unreadable
and stopped. **It belongs to a person, who reads it fine.** Human-in-the-loop
(@mentions, assignment) may close that loop without any server change. Don't
repeat the research's blind spot: every lens assumed a solo dev alone with a
board, and Trello is a collaboration tool.

### GATE 3 — Frequency × Judgment

> **Value = judgment × invocation frequency. Cost is paid every session,
> forever, in schema tokens and selection accuracy.**

Session-start ≈ 20/mo. Weekly ≈ 4. Monthly-if-remembered ≈ 0.3. Quarterly ≈
0.1. **A quarterly tool with brilliant judgment loses to a daily tool with
adequate judgment.**

**Smells:** a merge fusing two different frequencies (the quarterly half
borrowing the daily half's justification). *"The agent would call it before X"*
for an X the agent has no reason to pause at — agents file the card they were
told to file; they don't volunteer pre-flight checks. A tool whose only
discovery path is another tool's error message is a **dependency, not a tool**.

### GATE 4 — The Slot Ledger

> **What does this retire? Name it, in the same PR.**

~57 tools (VERIFIED 2026-07-16, post dead-tool cleanup; **re-check — a release
has landed since**). #50 says we're already unusable at a 20-tool cap. Every
addition taxes every other tool's selection accuracy for every user forever.

> **Rule: a ceiling tool that only adds is doing half the job. Net count flat or
> down, or argue why not.**

**Params are not tools, and the ledger must say so.** A parameter on an existing
hot tool costs **zero slots** — it is `57 → 57`. That is not a grudging "flat";
it is the ledger's **best available outcome** and a positive argument for the
change. A new cold tool and a param on a tool the agent already calls are
different objects. Classify first: *tool, param, default flip, or response
shape?* Only the first spends a slot.

**Smell:** a new tool whose name collides with a simpler incumbent (`get_card`
vs `get_card_brief`; `download_attachment` vs `read_card_attachment`). The agent
picks the shorter name and your tool is never called. **Fix the incumbent
instead — a default flip beats a new tool every time.**

### GATE 5 — The Find-and-Replace Test

> **Swap "lane" → "column". Does it ship unchanged on Linear/Jira/Asana?**

Then the judgment is generic — queue theory, two-phase commit, SQL, rendering —
**not Trello judgment**. `upsert_card`, `query_cards`, `apply_repair_plan`,
`get_board_digest` all fail this. **Encode what Trello refuses to model, not
what CS settled in 1978.**

> **SCOPE — read this before you swing it.** Gate 5 applies **only to proposals
> asserting Trello-specific judgment**. It hunts tools that *claim* judgment and
> deliver CS-101. A change justified by **compression** (Gate 4's exception,
> blessed by the North Star: *tokens it must receive to discard are already
> bought*) claims no judgment and is **exempt from Gate 5** — judge it at Gate 4
> on slot cost, then **run the standing tests anyway**.
>
> **Compression means discarding bytes the caller named.** If the server decides
> **what matters**, that's *semantics wearing compression's badge* — **Gate 5
> wakes up.** `labelFilter` (the caller names the label; the server drops
> non-matching rows) is compression. `summarize_board` (the server decides which
> facts are worth keeping) is semantics, and dies — on Gate 5, on Division of
> Labor, or on the North Star's three-calls test, whichever you reach first.
>
> Without this scope the gate kills `labelFilter` on `get_cards_by_list_id` — a
> zero-slot param, on the hottest read in the server, requested by a daily user
> with a behavioral loop — because "filter by attribute" ships on Linear too.
> **Generic-and-claims-judgment is fatal. Generic-and-genuinely-compression is
> fine.** Gates 1–3 are kill shots; **Gate 5 is a kill shot only within its
> scope.** Outside it, it is not advisory — it is *silent*.

### Then, and only then — the North Star

> Could a competent LLM do this with 3 existing calls and no meaningful loss?

Three honest reasons the answer is no: **capability** (the model *cannot* — it
can't decode base64, can't reach an unwired endpoint); **compression before
payment** (tokens it must *receive* to discard are already bought — server-side
filtering is the only place that saving exists); **determinism** (percentile
math over a censored log; the model is confidently wrong).

**"It's fewer calls" is not one of them. That's floor.**

### The standing tests

- **Silent-wrong.** What does it return when its assumption is false — and can
  the caller tell? `/^done$/` misses "Done ✅". **Absence of a key ≠ zero.**
  `null` + a named reason beats a plausible value. **A read tool that's
  confidently wrong once is uninstalled.** An audit tool that cries wolf on run
  one is uninstalled on run one.
- **Division of labor.** Tool does the deterministic multi-call, the join, and
  the **refusal**. LLM does the semantics. Never a regex where the model reads
  better; never a `confidence` field where a fact will do. A `where`/`select`/
  `on_conflict` mini-DSL means the caller supplies every gram of judgment —
  that's plumbing wearing an intent's name.
- **Board shape.** Run it against a board he actually has: Ideas / Doing / Done,
  emoji in list names, no custom fields, half the titles missing the prefix he
  started in March, a "Fridge" column, one member. **Boards that satisfy the
  tool's assumptions are boards whose owner already knows the answer.**
- **Mutation trust.** Emit a fix only if applying it to a card that didn't need
  it is a **no-op**. Field corrections yes; `create_checklist` as a side effect
  of *reading* no; `archive` on a heuristic never. **Assume the agent runs every
  `{tool, args}` you attach without asking** — suggest with a string, act with a
  payload. And never treat a region a human edits (the desc) as tool-owned.
- **Demand.** Behavioral, or inferred? **Real:** a third party hand-assembling
  the loop in public (sdlcnext: 11 calls on this server, calling
  `get_acceptance_criteria` *by name*). Repeated PRs (search ×3). An open issue
  from a daily user. A community revolt (Card Aging). People paying money
  (Corrello, Nave). **Not real:** *"every dev has this pain."* **Never fabricate
  a user quote.**
- **Surfaced, not queried.** The community forced Atlassian to un-kill Card
  Aging and said why: filters *"just hide the stagnant cards, not subtly remind
  us that they are still there."* A tool you must remember to invoke about a
  board you're not looking at **is a filter**. An agent at session start is the
  first channel in Trello's history that can tell you **unprompted**. Make
  findings ride along on calls the agent already makes. **Make it a field, not a
  verb.**

---

## The moat ledger — corrected. Overclaiming is how the pitch dies.

**Market position:** we're the **incumbent**, not the challenger. 422★ vs 35
(kocakli), 34 (hrs-asano), 3 (agrath). `atlassian/atlassian-mcp-server` (858★)
covers Jira/Confluence/JSM/Bitbucket/Compass and **zero Trello**; the official
Trello MCP is a separate, newer, thinner product at `mcp.trello.com/v1`. **Every
competitor is 1:1 endpoint mapping** — EndlessHoper says it out loud (*"no
higher-level workflow compositions"*, differentiator: 39 tools); Composio ships
**329**, which is 16× past the cliff. **The whole market competes on tool count.
Nobody competes on judgment.**

**PERMANENT (BELIEVED — the strongest legs, and none fully probed):**
- **Locality.** `mcp.trello.com/v1` is a cloud OAuth endpoint: no filesystem, no
  cwd, no git, ever. A topology gap, not a roadmap gap. *(Worthless until we
  create the commit↔card link — see Gate 1.)*
- **`/batch`.** Unverified by observation.
- **Butler cannot, by construction.** No if-statements (users publish
  "IF-Conditional hacks" as workarounds), trigger-time, stateless. It can never
  answer *"what is true about this board right now?"* Twelve years of history
  say this holds.
- **Taste.** Their capability table is organized by Trello **noun** — *"Cards:
  view, create, update, move, archive."* You cannot arrive at a verb by
  enumerating nouns.

**DEPRECATING — on Atlassian's published roadmap. Do not spend a PR defending
these:** activity & history, comments, attachments, custom fields, label
creation, board editing, card copying, member management, workspace creation. We
beat them on all of it *today*; all of it evaporates on a schedule they
announced.

**FALSIFIED — do not repeat these:**
- ❌ *"`/search` is a permanent moat; OAuth2 apps are structurally barred."*
  **Atlassian's Trello MCP ships keyword search today.** Both facts are true and
  they collide — the REST doc's OAuth2 bar is real, *and they shipped it anyway*
  (first-party bypass, elevated scopes, internal endpoint — mechanism unknown).
  The research picked the flattering half of a contradiction **already present
  in its own inputs**. This was the load-bearing frame of the entire
  positioning. It is gone.
- ❌ *"Custom fields are OAuth2-barred, therefore uncopyable."* **On their
  announced coming-soon list.** Same error, inverted: reading a demolition notice
  as a wall.
- ❌ *"Zero complaint threads about this server."* **20 open issues, several are
  complaints** — #47 (Smithery broken), #2 (npm package doesn't exist), #92
  (orphan processes), #50 (unusable on Perplexity), #21 (stuck at auth). The true
  claim is narrower: no *off-site* (Reddit/HN/X) threads.
- ❌ *"`ruvector.db` is tracked on main."* `git ls-files | grep -c ruvector` →
  **0.** Local cruft, not repo cruft.
- ❌ *"`src/index.ts.backup` drags coverage down via `include:
  ['src/**/*.ts']`."* It **is** tracked, but that glob doesn't match a `.backup`
  extension. Delete it anyway; the stated reason was fabricated.
- ❌ *"The modal npx installer is a solo dev on a free board."* **Zero evidence
  anywhere.** This invented persona killed the entire custom-fields territory,
  settled the audience question, and dismissed multi-agent — while stated as
  settled fact. **Watch for it reanimating.**

**The sentence that is the whole strategy:**
> **When Atlassian ships Activity & History, they'll ship `get_card_actions` — a
> passthrough — because their entire surface is noun-shaped. The endpoint
> depreciates. The interpretation doesn't.**

We don't win by *having* the action log. We win by being **the only people who
ever read it**. Cycle time, WIP age, dwell distributions, regression detection:
all derivable from ambient data, all sold today as paid Power-Ups (Corrello,
Nave), all shipped natively by Trello **nowhere**.

---

## The vein, ranked by evidence quality

1. **Interpretation of the transition log.** Ambient, zero convention, works
   run-one on every board, structurally impossible for Butler, and Atlassian's
   version will be a passthrough. **This is the vein.**
2. **The session loop.** A stranger published a tutorial hand-assembling **11
   calls on this server**, invoking `get_acceptance_criteria` by name. Composio
   documents the identical loop independently. The only behavioral demand signal
   of its kind in the corpus.
3. **`get_acceptance_criteria` itself.** Zero competitors have any AC concept.
   It's two lines. It currently lies silently.

---

## The roadmap (as of 2026-07-16, release status updated 2026-07-21 — argue with it, don't obey it)

**TIER 0 — the gate. CLOSED.** ~~Ship 1.8.0.~~ **DONE 2026-07-21 — 1.8.0 is
live on npm and the MCP registry, tagged.** The typecheck fix, `McpError`/
`ErrorCode` import, and the 4-dead-tool drop were done on
`fix/typecheck-and-dead-tools` (2026-07-16); the release itself has now landed.
**For the first time, a fix you ship reaches users.** Still open, all small, and
now genuinely worth shipping in the next cut: move comment text from query
string to request body (`client:633` — prerequisite for any structured
writeback); `get_acceptance_criteria` synonyms + `{items, percentComplete,
unmet[], matchedChecklistName}` + *say which checklists exist* when nothing
matches (~5 lines, **highest value-per-line in the repo**); `.unref()` the
health interval (#92 — orphaned processes); delete `src/index.ts.backup`. The
new leading question is no longer *"has it shipped"* — it's *"is 1.8.0 actually
being adopted, and is the tracker clearing?"* (see Ground truth).

**Then the substrate** (verified absent, unblocks everything): `getBoardCards()`
→ `GET /boards/{id}/cards` (one call replaces a sweep); `getBoardActions(boardId,
{filter, since, before})`; widen `TrelloAction.data` with `listBefore`/
`listAfter`/`old`; extract `resolveLanes()` and `resolveChecklists()` (kills the
4× copy-paste and a bug class); memoized `getMe()`; `searchCards()` as a
**private client method, not a tool** — search was rejected 3× as
`search_trello(query)` (#18/#53/#73) while #72 stays open naming the prize.
**The rejection is against the passthrough, not the capability.**

**TIER 1.** `start_work_on_card` (one call replaces the ~6-call session-start
ritual — the exact glue the sdlcnext author hand-wrote; retires the discovery
path for 5 tools). `checkpoint_work` (session-end writeback — the most-skipped
step in the loop is the **direct upstream cause of the board rot every audit
tool diagnoses**; and it's the writer that manufactures the convention Tier 3
needs). **Dwell as a *field*, not a tool** — `wipAge` rides along on the brief at
~20×/mo instead of a `find_stalled_cards` nobody remembers to call; report
**facts** (`dwellAge` from transitions, `lastTouch`), never a
`talked_not_walked` classification computed from the field you just called a
liar. Ship the **engine** (`src/flow/card-flow.ts`, pure, fixture-tested against
the 22% ratchet), not the report.

**TIER 2.** `get_board_changes_since` / standup (fold the action stream to one
terminal-state line per card; **drop the cursor** — a stdio server has nowhere
to put it; retires `get_recent_activity`). `download_attachment` **returns text**
(#101) — **not tool #62**; base64 is a null API with no contract to break. Board
lint **errors-only, as a ride-along**: ERROR = *the board is telling a lie
someone will act on*; WARN = *the board is untidy*. Gate every check on a
board-level base rate, or run one is 25 findings that are just his own habits
reflected back.

**TIER 3 — bets, and all Gate 1 failures today.** `reconcile_board_with_git`,
`get_card_dependencies` + `link_cards`, `what_shipped_since`. **`checkpoint_work`
planting trailers is what makes these possible at all.** The writer creates the
join key; then the readers become possible. **Do not build them first.**

**Not building:** the lease/multi-agent family (zero demand, N=1, and that N
already coordinates with a flock file at the orchestrator layer — the right
place); `upsert_card`/`query_cards`/`apply_repair_plan` (fail find-and-replace);
`get_card_brief`/`get_board_digest` (rendering opinions — **fix `get_card`'s
defaults instead**: flip `includeMarkdown` to true, map `actions`→`comments`
(currently never populated — the renderer pays for `actions_limit:100` and
renders zero comments), drop `stickers`/`pluginData`/`previews[]`. Zero new
tools).

---

## The four rebuttals to keep in the holster

1. **"Fix the incumbent."** Most proposals are a default flip plus a bugfix on a
   tool that already exists and already gets called.
2. **"Ship the engine, not the report."** If N candidates need the same
   pipeline, build it once in `src/` and consume it. Substrate ≠ tool surface.
3. **"Ship the writer first."** The reader is worthless until the corpus exists,
   and only the writer creates it.
4. **"Make it a field, not a verb."** Surfaced beats queried. Card Aging is the
   proof.

---

## Known blind spots — territory no research lens covered

Treat these as **open**, not absent. Do not let this file's confidence imply
coverage.

**Transport** (#5 SSE open, PR #103 "Streamable API" closed): every "stdio can't
do that" dismissal — webhooks, cursors — is downstream of a *contested product
decision*, not a law of physics. If HTTP transport lands, `watch_card`'s loop
closes properly. **Latency budget:** sustained ceiling is 10 req/s; a 200-card
sweep is 20+ seconds before backoff, and MCP clients time out. *Free to write ≠
free to run.* Nobody costed a single call in wall-clock. **Write-safety:** the
ACL gap above, in a roadmap of writers. **Onboarding** (#21): key+token is a
strictly worse funnel than OAuth consent — the moat's benefit is claimed, its
cost never booked. **Distribution:** Claude marketplace (#70), Power-Up
marketplace (#39), Smithery (#47 broken), npm (#2). **Human-agent
collaboration:** @mentions, assignment norms, what a human teammate needs from an
agent's writeback. **Trello plan matrix:** action lookback is limited on free
boards — that truncates the #1 territory and nobody checked. **i18n:** every lane
heuristic in the roadmap is an English regex. **Butler as a target, not a
rival** — the agent could *write* Butler rules. **Agent-action audit trail:**
"what did the agent do to my board?" has no answer.

**The issue tracker is a contaminated instrument.** #37, #31, #30, #38 request
features that **already exist in the repo** — artifacts of the (now-closed)
7-month release gap. An unknown fraction of the tracker measures the *publish
failure*, not demand. **Segment by pre/post-release before inferring anything
from it** — and, now that 1.8.0 has shipped, **watch whether these start to
close on their own** as adoption catches up. That decay curve is itself a demand
signal.

---

## Leverage rules — turn the doctrine into a number, and publish the bar

- **Bring the corpse.** Every recommendation names what it kills or retires. A
  proposal that only adds is half a proposal.
- **Never fabricate demand or a user quote.** Cite behavior, or cite Atlassian's
  documented gap, and say which.
- **Publish the bar.** `CONTRIBUTING.md` is generic GitHub boilerplate;
  `AGENTS.md` is claude-flow SPARC boilerplate with **zero Trello content**. The
  merge bar exists only in the `pr-crusher` agent, which no contributor can read.
  **That is the complete explanation for the passthrough-heavy PR mix** —
  contributors aren't ignoring the bar, they've never been told it exists. Ship
  the bar and a decision log of *why certain Trello primitives are deliberately
  NOT exposed*, and the inbound mix changes at the source.
- **Measure the doctrine.** The 8 evals are single-tool *"can you call this
  endpoint"* prompts on deprecated `gpt-4`, and **not one covers a ceiling
  tool**. The measurement apparatus cannot see the moat. A workflow eval — *"the
  card has 2 unmet AC; ship it"* must produce a **refusal**; *"what should I work
  on"* must produce **one card and a reason** — turns the doctrine from an
  opinion into a number he can publish.
