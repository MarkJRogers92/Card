# M08 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `codex/m08-reactions-delayed-packets`

Base: accepted M07 head `e35ac7b0c5561e27790dd2877b1d68da6bda60fd`

## Current state

M08 is accepted. It completes all sixteen material/form Reaction recipes and adds serializable next-player-turn-start packets for the four Loop Reactions. M09 mechanics were not started.

## Preserved contracts

- M07 Lead/Support/Crew classification is snapshotted before base effects.
- Manual and card-driven swap atomicity is unchanged.
- The shared Imprint still uses stored Potency for the current Reaction and stores incoming Prime afterward.
- Primary Reaction target reacquisition still uses authoritative enemy spawn order.
- Burst all-enemy effects use living enemies in spawn order at effect resolution.
- Delayed packets keep their original target and never retarget.
- Delayed Reaction damage stores the amount before target modifiers; Exposed is reevaluated at delayed execution.
- Scheduled packet effects cannot contain another scheduling operation.
- Scheduled player-turn-start packets resolve before the normal draw and are cleared when combat ends.

## Verification

Substantive M08 implementation commit `ce875b8ed3eff9535627aba8d3f274b7d73ac8f4` passed GitHub Actions run `34524366346`, including install, type/generated-content checks, all general unit/content/replay/property suites, every focused M03–M08 suite, and production build.

## Continuation rule

Begin M09 from the current head of `codex/m08-reactions-delayed-packets`. Implement only bounded trigger/modifier dispatch and the initial character passives specified by `docs/DESIGN.md`. Preserve M08 serialization/timing and do not begin M10 browser UI work. Do not modify `main` unless Mark separately asks for a merge.
