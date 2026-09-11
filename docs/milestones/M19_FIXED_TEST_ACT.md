# M19 — fixed test act

**Status:** local implementation checkpoint (not accepted, not pushed, CI acceptance pending)

**Branch:** `codex/m19-fixed-test-act`

**Head:** `ed7f9f5` (later documentation-only commit)

## Scope

M19 adds a deterministic seven-node Act 1 fixed route used by the browser fixture `?fixture=m19` and the command boundary tests. It demonstrates cross-node persistence for HP, deck/reward inventory, and terminal progress while rebuilding combat-only state for each encounter.

M19 is intentionally bounded to the act route and does not introduce save/load, map branching, shops/events/treasures/workshops, or authored production content.

## Fixed seven-node route

Route order:
`ordinary_1` → `rest_1` → `ordinary_2` → `elite` → `rest_2` → `ordinary_3` → `boss`

| Node ID | Formation | Encounter kind | Reward contract |
|---|---|---|---|
| `ordinary_1` | `claims_adjuster` | ordinary | ordinary reward |
| `ordinary_2` | `compliance_slug` | ordinary | ordinary reward |
| `ordinary_3` | `adjuster_and_intern` | ordinary | ordinary reward |
| `elite` | `repo_foreman` | elite | 35 Scrap, 2 relic options |
| `boss` | `head_of_recovery` | `act_1_boss` | 50 Scrap, 3 relic options, no card options |

M10 route behavior is intentionally untouched by this milestone.

## Engine boundary (implemented in `src/engine/run.ts`)

- `RunState` now owns versioned run data in authoritative state: `currentNodeId`, `completedNodeIds`, `partyHp`, `outcome`, and run/version metadata.
- `createM19Run(seed)` initializes `run` state from `createAuthoritativeState`, preserving gameplay RNG.
- `currentRunNode(state)` and `currentRunEncounter(state)` resolve the active node and mapped encounter metadata.
- `beginRunNode(state)` starts combat for the active node only.
- `completeRunCombat(state, catalog)` resolves victory rewards, copies persistent HP back into `run`, adds completed nodes, and preserves `run` + `rewards` as required.
- `restRunCharacter(state, actorId)` heals the selected actor by 18 and caps to max HP.
- `advanceRunNode(state)` enforces phase gating and moves to the next node or sets terminal victory.

## Implemented persistence and resolution rules

- `partyHp` is persisted in `RunState` and carried through node transitions.
- Scrap and claimed card/relic IDs are persisted through `state.rewards`; a completion command updates rewards but keeps the run context through state merges.
- A defeat ends the run immediately and produces no reward.
- Defeat/advance/reward phase constraints are enforced.
- Combat boundaries:
  - every combat node rebuilds combat-only state through the Act 1 setup factory,
  - per-node deterministic seed is derived from `state.rng.rootSeed` and node index,
  - `run` and `rewards` survive the boundary by explicit carry-over.
- `advanceRunNode` is rejected while a combat is active, while reward is pending, or while the active node is unresolved.

## Browser proof (`?fixture=m19`)

The M19 UI renders a compact status strip and node controls with:
`run-node`, `run-outcome`, `run-scrap`, `run-hp-morrow`, `run-hp-switch`, `run-pending`, `run-begin-node`, `run-resolve-node`, `run-fixture-damage-morrow`, `run-rest-morrow`, `run-rest-switch`, `run-advance`, `run-reward-option-*`, `run-reward-skip`, and `m19-command-log`.

The fixture intentionally adds two test-only controls:
- `run-resolve-node`: directly resolves combat outcome from the fixture path.
- `run-fixture-damage-morrow`: applies a deterministic 20-point Morrow damage action for route persistence checks.

This route uses fixture commands so route persistence can be verified without replaying the full combat UI loop.

## Verification recorded at head `ed7f9f5`

Local verification performed after this milestone implementation:

- `npm run check` pass
- `npm run test:m19` 2 files / 30 tests pass
- `npm run test:engine` 19 files / 310 tests pass
- `npm run test:content` 29 tests pass
- `npm run content:validate` VALID
  - card: `30/30`
  - relic: `10/10`
  - enemy: `0/0`
  - event: `0/0`
- `npm run test:replay` 1 test pass
- `npm run test:properties` 5 files / 6 tests pass
- `npm run build` pass
- `npm run test:browser` 4 tests pass (including new M19 route test)

Branch is not pushed; CI acceptance is pending.

## Boundaries

- **M20**: serialization and save-load.
- **M21**: persistent browser storage.
- **M22**: branching map, map nodes, shops, events, treasures, and workshop content.

M19 intentionally does not add any of those features.

## Open items

- Browser combat completion is still driven by a fixture force-victory control, not replaying full combat gameplay.
- Reward options are sourced from the fixed-act fixture catalog for M19, not from authored production content rotation.
- Run save/load/serialization is still unimplemented in this milestone.
