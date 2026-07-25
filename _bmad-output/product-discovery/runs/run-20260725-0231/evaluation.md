# Gate Evaluation — run-20260725-0231

Gates run in kill-shot order per `data/gates-rubric.md`; authoritative text is the product doctrine skill. Verification commands run this session are cited inline.

## Verdicts

### Idea C: AC heading tolerance + honest not-found — **SURVIVED (WINNER)**
- Prior kill: none. Doctrine lists this exact fix as open Tier 0 work ("~5 lines, highest value-per-line in the repo").
- Gate 1 (Convention): PASS — "Acceptance Criteria" already works because people *already* name checklists that; "AC"/"DoD" are the same descriptive convention in the wild. Descriptive conventions are free.
- Gate 2 (Loop): PASS — reads ambient checklist data.
- Gate 3 (Frequency × judgment): PASS — rides the session loop (daily for loop users); the judgment (which checklist is AC, honest not-found) is the product.
- Gate 4 (Slot ledger): PASS — default flip + response shape on an existing tool. 57 → 57.
- Gate 5 (Find-and-replace): PASS — on Jira/Linear, AC is a schema field; on Trello it's checklist-name folklore. Reading folklore correctly *is* Trello judgment.
- North Star: PASS — a competent LLM cannot reliably do this in 3 calls today because the tool lies to it about emptiness; the fix is a correctness/capability argument, not a call-count one.
- Load-bearing claim VERIFIED: `src/trello-client.ts:778-779` — `getAcceptanceCriteria` passes the hardcoded literal `'Acceptance Criteria'` to `getChecklistItems`; tool registered at `src/index.ts:1176`. (Doctrine said :796 — drifted; staleness noted.)
- Standing tests: silent-wrong is the *point* (return not-found + which checklists exist, never a bare plausible []); division of labor clean (deterministic match + honest refusal; LLM does semantics); mutation trust n/a (read-only).
- Net slot effect: flat.

### Idea A: labelFilter param — **SURVIVED (strong #2)**
- Gates 1–4: PASS trivially (ambient labels; daily; zero-slot param — the ledger's best outcome).
- Gate 5: EXEMPT by scope — genuine compression (caller names the label; server drops non-matching rows). The doctrine uses labelFilter as its canonical compression example.
- North Star: PASS — compression before payment; the saving only exists server-side.
- Standing-test warning (VERIFIED bug class): `trello-client.ts:354` nameFilter crashes when `fields` excludes `name` — any new filter param must force its own field into `fields`, or it reproduces the crash.
- Demand: VERIFIED #102. Net slot effect: flat.

### Idea B: start_work_on_card — **SURVIVED, WITH CONDITIONS (contested)**
- Gates 1–3: PASS (ambient data; daily session entry).
- Gate 4: CONTESTED — +1 slot. Winston: ship only with same-PR demotion of 4–6 constituent tools + CI slot budget, or don't land it. Mary: decouple — no telemetry exists to choose demotions; demoting on vibes is risk redistribution. Unresolved; escalated to operator.
- North Star: PASS *only if* Sally's receipt amendment holds — the response must be a composed session receipt (goal + first action, no follow-up call needed), else it's "fewer calls," which is floor.
- Demand: BELIEVED (twice-corroborated third-party hand-assembly; doctrine vein #2, "the only behavioral demand signal of its kind in the corpus"). Not a kill under the epistemic contract — but it sizes the bet.
- Doctrine position: Tier 1, after substrate (`getBoardCards`, `getBoardActions`, `resolveLanes/Checklists`). Substrate is VERIFIED absent (`grep -rn "listBefore|listAfter" src/` → 0 hits).
- Net slot effect: +1 (flat or negative only if a demotion ships with it).

### Idea E: 20-tool default profile — **SURVIVED, WITH CONDITIONS**
- Gates: n/a for 1–2; PASS 3 (affects every invocation); PASS 4 (deeply net-negative for capped clients); Gate 5 silent (no judgment claim).
- Conditions: Winston's breaking-change warning stands (existing installs silently lose tools; needs deprecation window + opt-out env flag). The "which 20?" question has no invocation telemetry to answer it (no analytics in repo — BELIEVED, unchecked). Sally's survivorship-bias counter noted (telemetry can't see churned users).
- Demand: VERIFIED #50. Effort: largest of the survivors; arguably multi-ticket (profile design, deprecation, docs).
- Net slot effect: negative (the ledger's dream) — but a design decision, not a quick ticket.

### Idea D: dwell/cycle-time as ride-along field — **SURVIVED, SUBSTRATE-BLOCKED**
- Gates: PASS all as amended to a field (Gate 3 fails for the standalone tool; the field amendment is what saves it — "make it a field, not a verb").
- Blocker: requires transition parsing (`listBefore`/`listAfter` — VERIFIED absent in src) and per-card actions on read paths → latency budget (10 req/s) unpriced. Doctrine places this in Tier 1 after substrate. Not a clean single ticket today.
- Standing test: report facts only (dwellAge, lastTouch), never classifications; free-board action-lookback limit must surface as a named reason (doctrine blind spot: plan matrix unchecked).

### Idea F: attachment honest-failure — **SURVIVED, SMALL**
- Gates PASS as amended (honest-failure-only; any fetch pipeline = death by Gate 5/plumbing).
- Demand VERIFIED #101, but weekly frequency and the smallest value of the survivors. Doctrine Tier 2 wants more (return text); Mary's amendment caps this ticket at the honest failure.

## Winner: Idea C — AC heading tolerance + honest not-found

**Why it beats the other survivors:** it is the only idea that is simultaneously (a) a *correctness* fix to the server's most differentiated capability, (b) zero-slot, (c) gate-clean with zero conditions, (d) demand-backed by the only externally-observed loop that invokes it by name, and (e) explicitly named by the doctrine as the highest value-per-line change in the repo. A (labelFilter) ties on cleanliness but is convenience, not correctness — a lying tool corrupts every downstream decision; an unfiltered read merely costs tokens. B is the best *big* idea but carries a contested slot condition and BELIEVED demand. E is leverage but a design decision with a breaking-change tail. D is substrate-blocked. F is small.

**Residual BELIEVED claims the operator is accepting:** none load-bearing for C. (The session-loop demand behind it is BELIEVED-carried, but C stands on correctness alone even if the loop demand evaporates.)

**Recommended sequencing (not part of this run):** A (labelFilter) as the immediate next ticket — same cleanliness profile, VERIFIED demand.
