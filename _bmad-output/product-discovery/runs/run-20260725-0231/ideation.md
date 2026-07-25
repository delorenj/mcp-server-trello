---
runId: run-20260725-0231
seedHash: party-seed-v1 + discovery.json top-5
generatedAt: 2026-07-25T03:05Z
voices: [mary, john, sally, winston]
rounds: 2 (initial divergence + cross-talk reactions)
---

# Ideation Output

## Seed

Party Mode seeded per `data/party-seed.md` with: open-field focus, top-5 demand signals from discovery.json (#102 labelFilter VERIFIED, #101 attachments VERIFIED, #72 search-capability VERIFIED, session-loop hand-assembly BELIEVED, #50 slot-cap VERIFIED), the doctrine vein (transition-log interpretation / session loop / get_acceptance_criteria), falsified constraints (search-moat gone, custom-fields coming-soon, fabricated solo-dev persona), the five gates as one-liners, and the standing constraint to cite a signal + name slot classification per idea. The broken-1.8.0 incident was explicitly excluded from ideation (separate track).

## Ideas (round 1 — divergence)

### Idea A: Add `labels` filter param to the hot card read
- Author personas: Mary, John, Winston (independently — unanimous)
- Rationale: only idea backed by a VERIFIED signal on the hottest read at zero slot cost; server-side filtering cuts context-token tax
- Demand signal cited: #102 (VERIFIED)
- Slot classification: param on existing tool — zero slots. Retires: nothing (adds nothing either)
- Frequency: daily

### Idea B: Ship `start_work_on_card` — encapsulate the ~11-call session loop
- Author personas: John, Sally, Winston
- Rationale: third parties already hand-assemble the loop and call `get_acceptance_criteria` by name; users wrote our product spec at 11× token cost
- Demand signal cited: session-loop hand-assembly (BELIEVED, twice-corroborated)
- Slot classification: new tool (+1). Retires: ~10 calls per invocation; Winston conditions it on same-PR demotion of 4–6 constituent tools to opt-in tier
- Frequency: daily (session entry point)

### Idea C: Make `get_acceptance_criteria` heading-tolerant + honest not-found
- Author personas: Mary, John, Winston (independently — unanimous)
- Rationale: the server's most differentiated capability silently returns [] on boards writing "AC"/"DoD"/"Definition of Done" — a trust-destroying silent lie
- Demand signal cited: session loop invokes it by name + doctrine vein (c)
- Slot classification: default flip + response-shape fix — zero slots
- Frequency: daily within the loop, weekly otherwise

### Idea D: Cycle-time / dwell computed from the transition log
- Author persona: Mary (as a tool); amended by John + Winston in round 2 to **a computed field riding existing reads**
- Rationale: strongest moat story — ambient data, Butler-impossible, Atlassian will ship a passthrough; weakest demand (inferential, no user asked)
- Demand signal cited: doctrine territory (a) only — self-flagged weak
- Slot classification: as amended — response-shape field, zero slots
- Frequency: as a field, rides the hot read (daily); as a tool, weekly — fails gate 3 unamended

### Idea E: Ship a 20-tool default profile
- Author persona: Sally
- Rationale: #50 is a discoverability failure; capped clients get a silently broken product; purely subtractive
- Demand signal cited: #50 (VERIFIED)
- Slot classification: default flip — net-negative slots
- Frequency: configured once, felt every invocation

### Idea F: Attachment access that returns text or an honest failure
- Author persona: Sally; hardened by Mary's round-2 amendment (honest-failure-ONLY, no fetch pipeline) and Winston's plumbing warning
- Rationale: base64-or-nothing trains users to route around the server
- Demand signal cited: #101 (VERIFIED)
- Slot classification: response shape — zero slots
- Frequency: weekly

## Round 2 — cross-talk (champion votes + key positions)

- **Mary champions C** (outvoting her own A): a silent lie corrupts every downstream decision; correctness > convenience. Disagrees with Winston's demotion precondition (no telemetry to pick the demotions — decouple). Amendment: F is honest-failure-only or killed.
- **John champions E**: everything else sits downstream of agents finding the right tools; notes Winston's demotion condition "is this concept wearing a trench coat." Disagrees with Sally's frequency-gate exemption (tier via profile instead). Amendment: D ships as a field or dies.
- **Sally champions C**: a lying product is worse than a missing feature. Disagrees with Mary's telemetry gate (survivorship bias — churned users generate no invocations). Amendment: B must return a session receipt or it's killable.
- **Winston champions D-as-field**: cheapest moat per unit of risk; we already fetch the data and discard it. Disagrees with Sally that E is "purely subtractive" (breaking change for existing installs; needs deprecation window). Holds his B condition: same-PR demotion + CI slot-budget assertion, or B doesn't land.

## Deferred / struck in-party

- **Search (signal #72)** — John refused to propose it: "opinionated search isn't designed yet; 'search but opinionated' without a concrete opinion is how you get a 4th rejection." Deferred for a sharper spec, not killed.
- **D as a standalone tool** — struck by its own author; survives only as a ride-along field.
