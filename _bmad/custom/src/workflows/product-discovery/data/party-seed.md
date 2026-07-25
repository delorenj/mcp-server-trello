# Party Mode Seed Template — Product Discovery

Used by step-03-party-mode to compose the seed prompt for the Party Mode sub-workflow.

---

## Template

```
We are running Product Discovery for `@delorenj/mcp-server-trello`, an MCP server whose product doctrine is opinionated workflow encapsulation over 1:1 endpoint mapping ("judgment made reusable, not endpoints wrapped"). Discovery has already gathered demand evidence. Your job in this roundtable is DIVERGENT product ideation under tight constraints.

## Run Focus
{run_focus_or_open_field}

## Demand Signals (from discovery — markers matter)
{top_5_demand_signals_with_VERIFIED_BELIEVED_markers}

## Doctrine Constraints (the bar your ideas must clear later)
- The vein (highest-evidence territories): {vein_summary}
- Falsified claims — do NOT build on these: {falsified_constraints}
- The kill-shot gates your ideas will face:
  1. Convention — does the data exist on a live board, written by nobody, unprompted?
  2. Loop — if it reads, who writes? If it writes, who reads?
  3. Frequency × judgment — a quarterly tool with brilliant judgment loses to a daily tool with adequate judgment
  4. Slot ledger — every new tool taxes selection accuracy; what does yours retire?
  5. Find-and-replace — if it ships unchanged on Linear/Jira, it's not Trello judgment

## Strict Constraints

1. **Bias HARD toward judgment-made-reusable over endpoint exposure.** "Expose Trello endpoint X as tool Y" with no encoded workflow is almost certainly wrong.

2. **Each idea must cite at least one demand signal above.** No signal → no idea. "Every dev has this pain" is not a signal.

3. **Each idea must name its slot classification** (new tool / param on existing tool / default flip / response shape) and **what it retires** — or argue why addition-only is justified.

4. **One ticket per idea.** No epics. If it can't be implemented behind a single board ticket, cut it down until it can.

5. **Diverge.** 5–8 distinct ideas, not one deeply explored. Convergence happens in a separate step. Argue with each other — amendments welcome.

## Your Output

Each persona contributes ideas. For each idea, capture:
- Title (imperative, short)
- Author persona
- Rationale (why this matters; tie to the demand signal)
- Demand signal cited
- Slot classification + what it retires
- Honest invocation-frequency estimate (daily / weekly / monthly / quarterly)

Run the Party Mode protocol. Surface distinct angles. Disagree out loud. Do not converge.
```

---

## Variable Reference

- `{run_focus_or_open_field}`: invocation focus, or "Open field within the doctrine's current vein and unblocked tiers"
- `{top_5_demand_signals_with_VERIFIED_BELIEVED_markers}`: from `discovery.json`, formatted as bullets with kind + marker
- `{vein_summary}`: the doctrine's ranked vein, one line each
- `{falsified_constraints}`: one-line falsified claims from the doctrine graveyard

## Rendering Rules

- Substitute all variables before passing to Party Mode
- Keep the seed under 1500 words; trim demand signals to the top 5
- The composed seed must be self-contained — subagents see nothing else
