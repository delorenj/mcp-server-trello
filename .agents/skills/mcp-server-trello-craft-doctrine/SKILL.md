---
name: mcp-server-trello-craft-doctrine
description: >-
  Architecture and craft doctrine for @delorenj/mcp-server-trello — how the
  server should be BUILT, as distinct from what it should do. Use when judging a
  PR or change for architecture/craft (not product value); deciding whether to
  extract an engine, collapse a duplication, or earn a design pattern; auditing
  for cross-cutting-concern gaps (authorization, retry, error-mapping, response
  shaping), silent-wrong bugs, dead quality gates, or resource leaks. Encodes the
  maintainer's taste — layered abstraction, Gang-of-Four patterns, hierarchical
  modular components, thoughtful reuse, regression-resistance, high observability
  — as enforceable gates, so good engineering is the path of least resistance
  ("passive habit injection"). Triggers: "is this well-architected", "should I
  extract this", "refactor", "DRY", "design pattern", "separation of concerns",
  "cross-cutting concern", "observability", "this keeps breaking", "craft review".
  Do NOT use for: what tools should exist / the moat (mcp-server-trello-product-doctrine);
  the release/publish procedure (mcp-server-trello-release); growth or distribution
  (mcp-server-trello-growth).
---

# mcp-server-trello-craft-doctrine

The **craft** North Star for `@delorenj/mcp-server-trello`. Its sibling
`mcp-server-trello-product-doctrine` decides *what should exist*; this decides
*how it is built*. They are enforced together — a change clears the product
gates **and** these — but they are different questions, and conflating them is
how a well-shaped feature ships as a landmine (four ceiling-shaped tools shipped
in 1.7 that `TypeError`'d on first call — see the standing debts).

> Every claim below tagged with a line number was VERIFIED on **2026-07-16** by
> the research that built `TheGardner`, and a release (1.8.0) has landed since,
> so **the whole debt ledger is overdue for a re-verify pass.** Re-run the grep
> before you lean on a line number. Recency is the confidence compass:
> `fdfind --type f --hidden --exclude .git -X ls -lt --time=ctime -r`.

---

## The North Star (the whole doctrine in one sentence)

> **Compile taste into structure, so that using the server well is automatic and
> using it badly is the harder path.**

This is the craft face of the product doctrine's deepest rule — *"make it a field,
not a verb; surfaced, not queried."* There, findings ride along on calls the agent
already makes. Here, **good engineering rides along on the shape of the code**: the
tested path is the easy path, the safe path is the only path, the reused engine is
closer to hand than the fifth copy-paste. The maintainer's years of architecture
judgment stop being tribal knowledge the moment they are the path of least
resistance for the next contributor — including his future self at 2am.

**Passive habit injection is the goal, not a slogan.** A doctrine you must
*remember* to apply is a filter (product doctrine, Card Aging: a tool you must
remember to invoke is a filter). A doctrine baked into defaults, choke points, and
gates applies itself. **Prefer the mechanism that removes the choice over the
convention that asks for discipline.**

---

## The epistemic contract (shared with the whole doctrine family)

Every factual claim about this codebase carries one marker:

- **VERIFIED** — you ran the command *this session* and read the output. Cite it.
- **BELIEVED** — plausible, load-bearing, unchecked. Say so. **A BELIEVED claim
  never justifies a refactor by itself** — a refactor moves working code and every
  move risks a regression; pay for it with a fact.
- **FALSIFIED** — checked and false. Record it so nobody re-opens it.

> **Rule: verify before you cut.** The most expensive craft mistake is a confident
> refactor of code you misremembered. `grep` first, `tsc` first, run the tool over
> stdio first — *then* move it.

---

## The craft gates — a change must clear all six

Run them on any PR, extraction, or new tool. They are ordered cheapest-to-check
first. Each maps a value you hold to a **test in this repo**, not a poster.

### GATE C1 — The Layer Test *(separation of concerns; "engine, not report")*

> **Where does the judgment live — in a pure core, or inline in the tool?**

Logic (parsing, folding, deriving, deciding) belongs in a **pure, I/O-free,
fixture-tested core** under `src/` (e.g. `src/flow/card-flow.ts`). The
`registerTool` handler is a **thin adapter**: validate input → call the engine →
shape output. Judgment inlined in a handler cannot be unit-tested at its natural
seam, cannot be reused by the next tool that needs the same fold, and forces an
end-to-end test to exercise arithmetic.

- **Ship the engine, not the report.** If N proposed tools need the same
  pipeline, build it once in `src/` and let the tools consume it. Substrate ≠
  tool surface.
- **Adapter (GoF) is the load-bearing pattern here:** tool → engine, and
  client-method → HTTP. The tool speaks MCP; the engine speaks domain; neither
  knows the other's transport.
- **Smell:** a `registerTool` body over ~15 lines that isn't just plumbing. The
  logic wants out.

### GATE C2 — The Duplication Test *(DRY, and duplication as a bug-class)*

> **Is this the third time this shape has been written? Then it is a refactor,
> not a paste.**

Duplication's real cost is not ugliness — it is **silent divergence**. The
checklist card-vs-board fork is copy-pasted **4× verbatim** (BELIEVED:
`trello-client.ts` 674/716/761/809, re-verify) and — the tell — **all four bypass
`handleRequest`**, so the paste didn't just repeat logic, it *dropped the
cross-cutting layer* (retry, rate-limit, error mapping) four times. That is C2 and
C3 failing together, which is the usual way they fail.

- **Rule of three:** the first is fine, the second is a watch, the third is
  `resolveChecklists()` / `resolveLanes()` — extracted, tested once, consumed
  everywhere. One correct implementation for everyone is the same "judgment made
  reusable" the product North Star sells to users, turned inward.
- **Template Method / Strategy (GoF)** is what the fork wants: one skeleton, a
  card-vs-board hook.
- **Do not abstract on occurrence one.** Premature extraction couples things that
  only rhymed. The gate fires on the *third* concrete instance, not the first
  anticipated one.

### GATE C3 — The Cross-Cutting Concern Test *(the choke point; make the safe path the only path)*

> **Can a new code path forget to apply this concern? Then the concern is in the
> wrong place.**

Authorization, retry/rate-limit, error mapping, and response shaping are
**cross-cutting** — every request needs them, so no request should have to
*remember* them. The standing failure: `validateWorkspaceAccess` (BELIEVED
`:171`) is called at exactly three sites (`:197/:297/:327` — `setActiveWorkspace`,
`createBoard`, `listBoardsInWorkspace`) and **zero card/list mutations check it.**
`TRELLO_ALLOWED_WORKSPACES` gates listings and guards nothing that writes. The ACL
is a convention three call-sites happened to honor; the rest forgot, exactly as
GATE C3 predicts they would.

- **Rule: you should not be *able* to write a mutation that skips the concern.**
  The check belongs in the **single choke point every request flows through**
  (`handleRequest`), applied by construction — **Decorator / Proxy /
  Chain-of-Responsibility (GoF)** — not sprinkled at call sites where the next
  contributor's paste omits it. Make the safe path the only path.
- This is the highest-leverage craft move in the repo, because *every* flagship on
  the product roadmap is a **writer**, and nobody has priced the blast radius of a
  hallucinated `cardId` reaching an unguarded mutation.

### GATE C4 — The Fetch/Use Invariant *(robustness; never touch data you didn't fetch)*

> **Does every predicate guarantee the field it reads was actually requested?**

The archetypal bug: `getCardsByList`'s `nameFilter` runs `card.name.toLowerCase()`
(BELIEVED `trello-client.ts:354`) on a card whose caller-supplied `fields` may have
excluded `name` → `fields:"id,due"` + any `nameFilter` → **`TypeError`**. The test
that "covers" it passes `fields:'name,idList'`, which includes `name`, so it never
walks the crash path. `get_acceptance_criteria`'s silent `[]` is the *same* bug in
a quiet register: filtering on data you didn't fetch, then failing — loudly or
silently — instead of saying why.

- **Rule: any filter/derive over a field must force that field into the request,
  or return a *named refusal*.** Never a plausible-but-wrong value; never a crash.
  `null` + a reason beats a fabricated answer. (This is the product doctrine's
  "silent-wrong" standing test, seen from the code side — the two doctrines meet
  here.)
- **Regression-resistance means the test walks the failure path**, not the happy
  one that happens to satisfy the assumption. A green test that never reaches the
  bug is worse than no test (see C5).

### GATE C5 — The Loud-Failure Test *(observability; gates that bite)*

> **When this is wrong, does the system say so — loudly, and where?**

Silence is the enemy of every value on this list. The history: `build:types` was
`|| echo`-ing its own failure into a green check; the typecheck was effectively
dead, which is how four tools calling non-existent client methods shipped; coverage
sat at ~22% **of the wrong surface** — the tests exercise module functions, never
the tool wiring, so all four dead tools passed CI while being `TypeError`s. **Coverage
of the wrong surface buys false confidence, which is worse than no coverage.**

- **Rules:**
  - Quality gates **fail the build**. No `|| echo`, no `catch {}` that swallows, no
    `build:types` that lies. (Fixed 2026-07-16; keep it fixed.)
  - Tests exercise the **real seam** — the tool wiring, driven over **stdio** — not
    just the functions underneath it.
  - **Every tool ships with an eval that drives it end-to-end, or it doesn't ship.**
    The doctrine you can't measure is an opinion; the eval turns it into a number.
  - Errors are **typed and located** (`McpError`/`ErrorCode`), never a bare string
    swallowed into a 200.
- Observability is the property that **the system tells you the truth when it is
  wrong.** A crawling `tsc` (the zod v3-vs-`zod/v4` `TS2589` explosion — 604ms once
  the import matched) is the type system telling you something; listen.

### GATE C6 — The Resource-Lifecycle Test

> **Everything you open, you close. Everything you schedule, you can stop.**

The health `setInterval` was never `.unref()`'d → **108 orphaned processes over
12-day uptimes** (#92). Timers, intervals, sockets, file watchers, child processes:
each owns its teardown. A process that won't exit is lying about being done — the
lifecycle twin of C5's observability.

- **Rule:** anything with a lifetime declares how it ends, in the same change that
  starts it. `.unref()` background timers; close what you open; on shutdown, drain.

---

## The GoF map — patterns are *earned by a force*, never applied by name

A pattern is a compression of a real pressure in the code. Reach for it when the
pressure is present; refuse it when it isn't (pattern cosplay is its own smell).

| Pressure in *this* repo | Pattern | Where it lands |
|---|---|---|
| Tool must not know Trello's transport; engine must not know MCP | **Adapter** | tool → engine; client-method → HTTP |
| A concern every request needs and any call-site can forget (ACL, retry, error-map) | **Decorator / Proxy / Chain-of-Responsibility** | the `handleRequest` choke point (GATE C3) |
| Card-vs-board fork; lane/checklist resolution repeated | **Template Method / Strategy** | `resolveChecklists()` / `resolveLanes()` (GATE C2) |
| A multi-call ritual the caller repeats by hand | **Facade** | `start_work_on_card` wrapping the ~6-call session-start (this is also a *ceiling* tool — craft and product agree) |
| One board fold, many readers | **Shared engine module** | `src/flow/*` (GATE C1) |

**The rule that keeps this honest:** name the *force* before the pattern. "This is a
Facade" is cosplay; "the sdlcnext author hand-wrote these six calls, so a Facade
retires the ritual" is architecture.

---

## Passive habit injection — the mechanisms that make craft automatic

Ranked by how little discipline they demand of the next contributor:

1. **Defaults that encode taste.** Flip `includeMarkdown` to `true`; map
   `actions`→`comments` (the renderer already pays for `actions_limit:100` and
   renders zero comments); drop `stickers`/`pluginData`/`previews[]`. The good
   output becomes the *default* output — zero discipline required. **A default flip
   beats a new tool every time.**
2. **Choke points that remove the choice** (GATE C3). The contributor *can't* skip
   the ACL because there's no path around it.
3. **Engines that make the tested path the easy path** (GATE C1). Reaching for the
   pure module is less typing than re-deriving the fold inline.
4. **Publish the bar.** `CONTRIBUTING.md` is generic boilerplate; `AGENTS.md` is
   SPARC boilerplate with zero Trello content; the real merge bar lives only in
   `pr-crusher.md`, which **no contributor can read.** That is the complete
   explanation for the passthrough-heavy, craft-thin PR mix — contributors were
   never told the bar exists. **Ship the bar** (a `CONTRIBUTING.md` that states these
   gates, and a decision log of *why* certain primitives are deliberately not
   exposed) and the inbound mix improves at the source, passively.

---

## The standing craft debts (VERIFIED 2026-07-16 — re-verify; a release has shipped since)

The nightly tick's punch-list. Each is tagged with the gate it fails.

| Debt | Gate | Note |
|---|---|---|
| Checklist card-vs-board fork copy-pasted 4× (`674/716/761/809`), all bypassing `handleRequest` | C2 + C3 | Extract `resolveChecklists()`; route through the choke point |
| `validateWorkspaceAccess` guards 3 read sites, 0 writers | **C3** | Highest blast-radius; every roadmap flagship is a writer |
| `nameFilter` crashes on excluded `fields` (`:354`); test never walks the path | C4 + C5 | Any new filter param reproduces this until the invariant is a rule |
| `get_acceptance_criteria` returns silent `[]` on "AC"/"DoD" | C4 | Same bug, quiet register; add synonyms + named refusal |
| ~22% coverage, of the wrong surface (module funcs, not tool wiring) | C5 | Tests must drive tools over stdio |
| Health interval not `.unref()`'d → orphaned processes (#92) | C6 | 108 procs / 12-day uptimes |
| Only one tool shapes its response; the rest `JSON.stringify` raw Trello JSON into context | C1 | Response shaping is a cross-cutting layer, applied once |
| `formatCardAsMarkdown` (~155 lines) buried behind `includeMarkdown:false`, undocumented | passive-injection | Capability exists; the default hides it |
| `src/index.ts.backup` tracked | C5 hygiene | Delete; it's noise (the coverage claim about it was FALSIFIED) |

---

## Anti-patterns (each is a way this doctrine gets misused)

- **Pattern cosplay.** Applying a GoF name with no force behind it. Abstraction has
  a carrying cost; an unearned one is negative value.
- **Premature extraction.** Abstracting on occurrence one couples things that only
  rhymed. The rule of three exists to buy evidence first.
- **A leaky abstraction.** An engine whose callers must still know the thing it was
  built to hide (the checklist fork leaking `cardId`-vs-`boardId` back to every
  caller). If the abstraction doesn't absorb the fork, it isn't one.
- **A test that is green while the code is broken** (C5). Worse than no test — it
  buys false confidence and it's the exact failure that shipped four dead tools.
- **A refactor justified by a BELIEVED claim.** Moving working code on a memory is
  how a cleanup becomes an outage. Verify the shape first.
- **"It's cleaner" with no named force.** Cleaner is a feeling; a gate is a test.
  If you can't name which gate the change satisfies, you're grooming, not building.

---

## Operating notes

- **Enforced in two places, not in anyone's head:** the inbound PR gate
  (`pr-crusher`, which yields to this skill) and the **nightly TheGardner tick**
  (which re-verifies the debt ledger and advances one item). That is the passive
  mechanism — the doctrine applies itself on a cadence.
- **This skill judges craft, never product.** "Should this tool exist?" →
  `mcp-server-trello-product-doctrine`. "How do we ship it?" →
  `mcp-server-trello-release`. "How do we grow it?" → `mcp-server-trello-growth`.
- **You may recommend and delegate; you do not silently rewrite `src/`.** A craft
  finding names the gate it fails, the concrete fix, and what regression the fix
  must not cause.
- **Memory.** Bank is the repo name. Retain **killed refactors and why** (a
  duplication left standing because the third instance genuinely differs) as
  eagerly as applied ones — `hindsight memory retain mcp-server-trello "<fact>"
  --context architecture`.
