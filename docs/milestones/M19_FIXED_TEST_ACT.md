# M19 — fixed test act

**Status:** local implementation checkpoint (not merged to `main`, acceptance evidence recorded on push)

**Branch:** `codex/m19-fixed-test-act`

**Head:** `bef04e3` (`docs: add M19 publish handoff`, pushed branch head)

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

## Verification recorded at head `bef04e3`

GitHub Actions workflow **M19 Acceptance** completed successfully on
`2026-09-11` for branch `codex/m19-fixed-test-act` with run
[`34646210340`](https://github.com/MarkJRogers92/Card/actions/runs/34646210340) at
commit `bef04e38e08a031cd99db15cda907c1a54573236` (`bef04e3`) and conclusion
`success` (started `2026-09-11T20:49:12Z`).

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run content:validate`
- `npm run test:replay`
- `npm run test:properties`
- `npm run test:m03`, `npm run test:m04`, `npm run test:m05`, `npm run test:m06`, `npm run test:m07`,
  `npm run test:m08`, `npm run test:m09`, `npm run test:m10`, `npm run test:m11`,
  `npm run test:m12`, `npm run test:m13`, `npm run test:m14`, `npm run test:m15`,
  `npm run test:m16`, `npm run test:m17`, `npm run test:m18`, `npm run test:m19`
- `npm run build`
- Chromium installation
- `npm run test:browser`

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

This local evidence remains accurate for the implementation commit and precedes the pushed CI acceptance record.

## Boundaries

- **M20**: serialization and save-load.
- **M21**: persistent browser storage.
- **M22**: branching map, map nodes, shops, events, treasures, and workshop content.

M19 intentionally does not add any of those features.

## Open items

- Browser combat completion is still driven by a fixture force-victory control, not replaying full combat gameplay.
- Reward options are sourced from the fixed-act fixture catalog for M19, not from authored production content rotation.
- Run save/load/serialization is still unimplemented in this milestone.
