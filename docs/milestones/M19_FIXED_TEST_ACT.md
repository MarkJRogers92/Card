# M19 — Fixed Test Act

## Scope

M19 delivers the second playable checkpoint: one deterministic, linear
seven-node Act 1 route that a headless script and the browser can both
complete. It proves that persistent run data survives across combats while
combat-only state is rebuilt for each encounter. It adds no map generation,
saves, shops, events, treasure, workshop, profile, or new content.

## Fixed route

`M19_NODE_IDS` is authored, not generated:

1. `ordinary_1` — ordinary combat
2. `rest_1` — rest
3. `ordinary_2` — ordinary combat
4. `elite` — Repo Foreman
5. `rest_2` — rest
6. `ordinary_3` — ordinary combat
7. `boss` — Head of Recovery

Ordinary combat nodes pick their formation from the authored M17 list with
`(seed + nodeIndex) % ACT_1_ORDINARY_ENCOUNTERS.length`; elite and boss nodes
use `ACT_1_ELITE_ENCOUNTERS` and `ACT_1_BOSS_ENCOUNTER`. Encounter selection
never inspects card or relic IDs.

## Engine contracts

`src/engine/run.ts` owns a versioned `RunState` embedded in authoritative state
as `state.run`. `AUTHORITATIVE_STATE_VERSION` moves from 7 to 8 because the
authoritative shape changed.

- `createM19Run(seed)` creates a fresh run with both characters at full HP, no
  active combat, no completed nodes, and the starter deck implied by `deck:
  null`.
- `beginRunNode` starts the current node's combat through `createAct1Combat`,
  which rebuilds turn, actor, deck-zone, status, intent, and combat-RNG state
  from the persistent run data and the authored M17 formation. Supplied
  character HP carries into the fight.
- `completeRunCombat(state, catalog)` requires a resolved combat. A victory
  copies persistent HP and deck instances back into `RunState`, records the
  node, and creates the M18 reward with transaction ID `m19.<nodeId>.reward`
  (15 Scrap ordinary, 35 elite, 50 boss). A defeat ends the run and creates no
  reward. Repeating the command for a completed node is a no-op.
- `restRunCharacter(state, actorId)` heals exactly one character by 18, capped
  at that character's maximum HP, and completes the rest node.
- `advanceRunNode` rejects an unresolved combat, an incomplete node, or a
  pending reward; it clears the combat and moves to the next node, or sets the
  run outcome to `victory` after the boss.
- `applyM19Command` reuses the M10 card command surface with the full M17 enemy
  registry on end of turn. `getM19Hand` renders generated junk (for example
  `junk.invoice`) as an unplayable card instead of failing on an unknown starter
  definition.

## Persistence boundary

- Character HP persists between nodes; only rest changes it outside combat.
- The deck persists as card instances; each new combat re-creates zones,
  Energy, turn counters, statuses, intents, and combat RNG.
- Scrap, claimed card-definition IDs, and claimed relic IDs persist in the
  existing M18 reward state and are never re-rolled by M19.

## Browser route

`?fixture=m19` renders a compact test-act strip (current node, completed nodes,
both character HPs, Scrap) with `run-node`, `run-begin-node`,
`run-rest-morrow`, and `run-advance` controls. It calls only M19 and M18 engine
commands. The default M10 route and the `?fixture=m18` reward fixture are
unchanged.

## Boundaries for later milestones

- M20 owns serialization; M21 owns persistent browser storage.
- M22 owns the branching map, its generator, shops, events, treasure, and
  workshop nodes.
- `M19_TEST_ACT_REWARD_CATALOG` is a test-act catalog built from existing
  `content/` cards and relics. Live unlocks and content-driven reward pools
  remain outside M19.

## Card rewards and content cards

A first pass over the act found that claiming a card did nothing: the option was
recorded in `rewards.claimedCardIds`, but no deck instance was created, and the
act refused any definition outside the M10 starter set, so a picked card could
not have been played even if it had been.

`claimRunReward` in `src/engine/run.ts` now claims the option and appends a real
deck instance, which `completeRunCombat` persists and `beginRunNode` carries
into every later node. The claim stays idempotent because a repeated option
never reaches the insertion.

Playing those cards needs their content definitions, so `src/content/bundle.ts`
collects the checked-in JSON for the browser and tests while the CLI keeps using
the validating `registry.mjs`; both read the same files. `applyM19Command`,
`getM19Hand`, and the card views accept that bundle: starter cards keep the M10
path, content cards run through `playContentCard`, and a deck that contains
content cards settles its hand with the M11 lifecycle
(`endPlayerTurnWithCardLifecycle`) so Retain, Fleeting, Exhaust, and unplayable
junk behave as authored. Decks without content cards keep the original
`endCombatTurn` path, so existing hashes and traces are unchanged. Without a
bundle the act still refuses unknown definitions instead of silently ignoring
them.

### First-pass playthrough

Driving the act with a damage/block policy that claims the first offered card:
`ordinary_1` victory in 2 turns without taking damage, `rest_1`, `ordinary_2`
victory in 3 turns, then defeat on turn 5 of the elite. Every node resolves, the
claimed cards change the deck and the fights, and the run ends in a legitimate
defeat rather than an exception. The elite remains a real difficulty check for a
policy that does not use Retain, handoffs, or Imprints well; that is a balance
observation for the difficulty pass, not a defect.

### Still open after this pass

Claimed relics are not installed into later combats — `installRelicContent` is
used only by tests — so a relic pick is still inert. That correction needs a
`RunState.relicIds` field, which changes the authoritative shape and therefore
requires a save-schema migration.

## Local verification

`npm run check`, `npm run test:engine` (292 tests), `npm run test:content`,
`npm run content:validate`, `npm run test:replay`, `npm run test:properties`,
`npm run test:m18`, `npm run test:m19` (11 tests), `npm run build`, and
`npm run test:browser` pass locally.
