# M15 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `codex/m15-remaining-relics`

Base: accepted M14 documentation head `7ace3d4764a185912512ba955934a5ff428084eb`

## Current state

M15 is an acceptance candidate. The remaining five initial relics are implemented
as production content with generic modifier-driven runtime hooks. M16 has not
started and `main` remains untouched.

## M15 relics

- Refund Capacitor — first Potency-3 primary Reaction each player turn refunds
  1 Energy.
- Arc Welder — same-owner Volt reinforcement gains one additional Potency,
  capped at 3.
- Counterfeit Seal — first Grafted card each player turn costs 1 less Energy,
  minimum 0, through a generic cost hook reserved for M24 integration.
- Carbon Copy — first primary Loop Reaction each player turn adds one 50%
  delayed repeat, flooring each output separately and omitting zeros.
- Blank Badge — generic card-reward option count becomes 4 rather than 3,
  reserved for M18 reward integration.

## Important architecture boundaries

- M15 behavior dispatches by modifier channel/condition, never relic ID.
- Carbon Copy copies only the original scheduled packet IDs returned by the
  primary Reaction, preventing recursive copies.
- The namespaced first-per-turn modifier ledger lives in
  `combat.triggerCounters.turn` and is reset by the existing turn reset.
- Do not implement Grafting early; the compiler is M24.
- Do not implement card reward generation early; that is M18.
- Do not begin M16 transformations before M15 acceptance.
- Do not alter the stable M10 browser regression fixture.

## Acceptance procedure

Inspect the `M15 Acceptance` workflow for the exact substantive M15 head.
If green, record the exact run ID and commit in this handoff,
`docs/STATUS.md`, and `docs/milestones/M15_REMAINING_RELICS.md`, then make a
documentation-only acceptance commit. If red, fix the actual failure without
weakening tests and rerun the complete workflow.
