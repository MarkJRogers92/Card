# Architecture

## Chosen stack

The repository is one npm package: strict TypeScript, Vite, React, PixiJS 8,
JSON content, JSON Schema/Ajv validation, Vitest, fast-check, and Playwright.
The package lock is committed. Desktop and mobile adapters are later work.

## Dependency boundary

~~~text
src/engine  -> standard TypeScript only
src/client  -> React UI and future presentation adapters
src/content -> validated data and loaders (M01+)
src/platform -> browser/desktop/mobile adapters (later)
~~~

src/engine must remain independent of React, PixiJS, DOM APIs, browser storage,
and platform services. The client may import the engine boundary; the engine may
not import the client.

React owns menus and accessible controls. PixiJS will own battlefield
presentation when that adapter is introduced. Neither layer owns HP, deck order,
Energy, targeting, damage, triggers, card lifecycle, or other authoritative state.

## M07 duo and Reaction boundary

- `src/engine/duo.ts` owns formation-derived card classification and atomic swap accounting.
- `src/engine/imprint.ts` owns the typed shared Imprint and Potency invariants.
- `src/engine/reactions.ts` owns declarative Reaction recipes and generic ordered effect resolution.
- A card-resolution context snapshots Lead/Support/Crew classification before base effects. The post-card ingredient step consumes that internal snapshot after base effects, preserving specified timing even when the card swaps formation.
- `enemySpawnOrder` is serialized separately from displayed enemy execution order and supplies deterministic primary-Reaction reacquisition.
- The M07 resolver exposes engine operations, not content-ID conditionals or UI behavior. The future card compiler maps validated card definitions into these operations.

## M08 delayed-packet boundary

- `src/engine/reactions.ts` contains all sixteen material/form recipes as declarative data consumed by the same generic resolver.
- `src/engine/scheduled.ts` owns serializable delayed Reaction packets. Packets contain only plain authoritative data and cannot contain another scheduling operation, making recursive repeats structurally unavailable.
- A delayed Reaction damage effect snapshots its amount after source-side calculation and before target-side direct-damage modifiers. Exposed is therefore reevaluated when the delayed hit lands without reapplying source-side modifiers.
- Loop packets store the selected enemy actor ID at creation. A dead delayed target fizzles; scheduled packets never use primary-Reaction spawn-order reacquisition.
- `beginPlayerTurn` clears player Block, refills Energy/resets manual swaps, resolves due player-turn-start packets, and only then draws cards. Lethal scheduled effects can therefore end combat before a new hand is drawn.
- Scheduled packet IDs use a monotonic combat-local ordinal retained in authoritative state. Consumed packet IDs are not reused.

## M09 trigger/modifier boundary

- `src/engine/triggers.ts` owns deterministic trigger eligibility, ordering, turn/combat counters, non-consuming previews, bounded dispatch, and generic modifier collection.
- Trigger ties resolve by declared priority, stable source ID, then stable trigger ID. Modifier ties use the same ordering shape with modifier ID as the final key.
- Trigger bindings and counters are authoritative combat data. Turn-scoped counters reset during `beginPlayerTurn` before scheduled M08 packets and the normal draw; combat-scoped counters persist.
- M09 enforces a 256 generated activation/effect development ceiling per dispatcher invocation and throws rather than silently truncating work. Current M09 effects cannot emit descendant trigger events, so self-reentry is structurally unavailable in this slice. Future command-level composition must carry Section 8.12 ancestry metadata and preserve the command-wide ceiling.
- `src/engine/initial-passives.ts` declares Morrow/Thick Blood, Switch/Open Channel, and Shared Warranty as bindings rather than card/relic-ID branches in gameplay resolvers.
- `src/engine/duo.ts` emits a generic `after_swap` event only after the atomic Energy/formation/manual-count state is built. A card-driven free swap can therefore trigger Shared Warranty without consuming the manual free-swap allowance.
- `src/engine/passive-card.ts` wraps the M08 post-card ingredient/Reaction resolver and emits `card_played` afterward using the already snapshotted classification. It does not reclassify after base effects.
- Modifier dispatch currently performs deterministic channel/condition selection and ordering. Arithmetic remains with the channel owner so rules such as one-final-floor damage calculation are not accidentally generalized incorrectly.
- Run- and command-scoped counter lifetime is not faked inside combat state. Those scopes are completed when the corresponding command/run orchestration exists.

## M10 playable-checkpoint boundary

- `src/engine/m10-fight.ts` is a bounded first-playable orchestration layer. It owns the six starter-card checkpoint definitions, the Claims Adjuster checkpoint behavior registry, fight setup, and the `play_card` / `swap` / `end_turn` command surface.
- The M10 card table is data-driven and resolves through existing engine operations; React does not calculate Energy, damage, Block, Imprints, Reactions, swaps, passives, enemy actions, or turn timing.
- M10 does not pretend to be the final general card compiler. The narrow starter effect set exists only to make the first fight playable before production content expands.
- `src/client/App.tsx` is a projection/control layer over authoritative state. It renders combatants, intent, target selection, Imprint, hand, resources, and controls, then submits M10 commands back to the engine.
- The browser exposes the authoritative hash and its ordered M10 command log for test/debug verification. `tests/browser/m10-combat.spec.ts` replays the browser-produced command log through the same headless M10 command API and requires identical final hashes.
- Restart constructs a fresh deterministic M10 fight rather than mutating the previous combat snapshot.
- `Change of Shift` retains its checkpoint-local exhaust destination inside M10. M11 now provides the general keyword lifecycle for production cards; the M10 shortcut remains frozen as a browser regression fixture rather than being expanded.
- Chromium is the M10 scripted-browser acceptance target. Broader cross-browser release verification remains a later release gate.

## M11 card-lifecycle boundary

- `src/engine/card-lifecycle.ts` owns the reusable lifecycle contracts for Exhaust, Retain, Fleeting, Unplayable, Protocol, and additional self-HP card costs.
- Card playability is checked before costs or zone changes. Unplayable cards therefore cannot consume Energy, HP, or card-zone state.
- Energy and all additional HP costs are prevalidated before any payment is committed. HP costs resolve before base effects, bypass Block, and enforce the global requirement that the payer remain at 1+ HP.
- Normal played cards enter discard; Exhaust cards enter exhaust; Protocol cards enter deployed. Exhausted and deployed cards remain outside discard reshuffles.
- Player-turn-end hand settlement resolves Fleeting first, then Retain, then ordinary discard. This matches the explicit turn-sequence ordering and avoids ambiguous dual-keyword behavior.
- Protocol trigger bindings are appended only after the installing card has completed the existing post-card/Reaction/trigger step, so a newly installed Protocol never retroactively observes its own installation play.
- Protocol copies remain separate card instances and may install separate trigger bindings. Stable per-instance source IDs allow independent limits and deterministic stacking through the M09 dispatcher.
- `endPlayerTurnWithSettledHand` is a narrow combat primitive used by the M11 lifecycle so keyword settlement can occur before the existing status/enemy-phase transition without rewriting M03 turn logic.
- M11 introduces no UI-owned rules and no new content-ID branches. M12 production Source cards should use this lifecycle surface rather than extending the M10 checkpoint layer.

## M12 content-execution boundary

- `src/engine/card-content.ts` is the first generic bridge from validated `schemas/card.schema.json` content (the generated `CardDefinition` type in `src/content/generated.ts`) to the M03–M11 engine primitives. Before M12, only the frozen M10 checkpoint table (`src/engine/m10-fight.ts`) executed anything resembling card content, through its own bespoke, narrow `M10CardEffect` union; no generic content-driven executor existed.
- `resolveValueExpr` evaluates the content expression language (`const`/`param`/`add`/`multiply`) against a card's resolved base-or-upgraded parameters; `stat` expressions are not yet needed by any accepted content and throw a clear error rather than a silent no-op.
- `applyCardBaseEffects` dispatches a card's ordered `effects` array purely on `effect.op`, calling straight through to the existing M04/M06/M08/M09 primitives (`calculateAttackDamage`/`applyDirectDamage`, `applyCombatStatus`, `gainBlock`, `healActor`, `gainEnergy`). It never branches on a card or definition ID. `install_protocol` effects do not mutate state directly; they compile into a `TriggerBinding` (reusing the existing `card_owner`/`classification` trigger conditions and `gain_block` trigger effect, resolved against the specific card instance's own owner) and are threaded through `finishCardPlayLifecycle`'s existing `protocolBindings` parameter, so Protocol non-retroactivity continues to hold without any card-content-specific exception.
- `playContentCard` is the generic counterpart to `m10-fight.ts`'s `playM10Card`: `snapshotCardResolutionContext` → `assertCardPlayable` → `payCardCosts` → `movePlayedCardForLifecycle` → `applyCardBaseEffects` → `finishCardPlayLifecycle`. Any future content-defined card (Shaper, Crew, ...) reuses it unchanged; only `applyCardBaseEffects`'s dispatch needs extending as new operations are actually needed by new content.
- Only the operations M12's 12 Source cards actually use are implemented (`damage`, `apply_status`, `block`, `heal`, `gain_energy`, `install_protocol`, and the `after_source_lead` Protocol trigger event). Every other content-schema operation and Protocol event throws an explicit "unsupported" error instead of silently doing nothing; this is a deliberate scope boundary; do not treat an unsupported-operation error as a bug without also checking whether the calling content should exist yet.
- `card-lifecycle.ts`'s `finishCardPlayLifecycle` now tolerates a combat that turned non-active during the same card's own resolution (`requireCombatForFinish`, replacing an unconditional `requirePlayerCombat` call). This was a genuine gap, not an M12-specific carve-out: a non-Protocol card's own lethal base effect could previously never complete the M11 finish step at all. The accepted M11 suite never exercised this combination and is unaffected; Protocol cards still require the deployed-zone/active-combat invariants the M11 suite does exercise.
- `gainEnergy` in `combat.ts` is the generic inverse of `payEnergyCost`, needed because no card before M12 ever granted Energy as a base effect.

## M13 content-execution boundary

- `src/engine/card-content.ts` gained multi-target effect resolution: `resolveEffectTargetActorIds` returns an array (one or many actor IDs) for `all_enemies` (reusing a private `livingEnemyActorIds`, mirroring `reactions.ts`'s own private `livingEnemyIds`) and `both`/`front`/`reserve` (reusing the existing `targeting.ts` `resolveTargetRule`), instead of the M12-era single-target resolver. `damage`/`apply_status`/`block`/`heal` all loop over the resolved target list generically.
- `damage` effects with `category: "direct"` now route through the existing `applyHpLossBypassingBlock` (the same primitive Bleed/Poison ticks and self-HP costs already use) instead of `calculateAttackDamage`. This is a general capability of the executor, not specific to any one card; M13 needed it for Fine Print.
- `draw` and `swap` (free mode only) effects dispatch straight through the existing `deck.ts` `drawCards` and `duo.ts` `swapCharacters`. A card-driven paid ("normal" mode) swap is not yet needed by any accepted content and throws a clear "unsupported" error rather than being guessed at.
- `boost_imprint` dispatches to `imprint.ts`'s new `boostImprintPotency`, which adds Potency to an existing Imprint only (capped at `MAX_IMPRINT_POTENCY`) and is a no-op when no Imprint exists. The card schema has no card-level eligibility/requirement mechanism (unlike events' `Predicate`), so a card whose text says "Requires an X" is not yet engine-enforced; that is a documented scope boundary, not an oversight, until card play-eligibility gating exists.
- `compileProtocolTrigger` now compiles two `ProtocolTrigger.event` values: the existing `after_source_lead` (M12, Thick Skin) and a new `after_primary_reaction` (M13, Operating Manual), each into its own engine `TriggerBinding` event/condition/effect shape. Other `ProtocolTrigger.event` values remain unsupported and throw explicitly.
- `src/engine/triggers.ts` gained a second `TriggerEventKind`, `"primary_reaction"`, and its `PrimaryReactionTriggerEvent` payload (`frontActorId`, captured at dispatch time), plus a `"current_front"` `TriggerEffectTarget` that reads that captured field. `src/engine/passive-card.ts`'s `resolvePostCardIngredientWithTriggers` dispatches this event whenever `resolvePostCardIngredient` produced a primary Reaction (`resolved.reaction !== null`), before its existing `card_played` dispatch, so a Protocol reacting to "any primary Reaction" observes it regardless of which card or which character caused it. No existing `TriggerCondition`/`conditionMatches` change was needed: a binding with `conditions: []` (Operating Manual's) matches unconditionally once its `event` kind matches, exactly like Shared Warranty's `after_swap` binding already did.
- `schemas/common.schema.json`'s `Keyword` enum gained `"liability"` (Fine Print). It is deliberately kept out of `card-lifecycle.ts`'s M11 keyword vocabulary: `card-content.ts`'s `cardLifecycleSpecFor` filters content keywords down to the M11-recognized set (`CARD_KEYWORDS`, re-exported from `card-lifecycle.ts`) before constructing a `CardLifecycleSpec`, so the M11 lifecycle module itself needed no changes and remains unaware "liability" exists. A separate new `card-content.ts` export, `endPlayerTurnWithContentCards`, resolves each in-hand liability card's own `effects` (via the same generic `applyCardBaseEffects` dispatcher used for played cards) before delegating to the unmodified `endPlayerTurnWithCardLifecycle`, matching `docs/DESIGN.md` Section 2.8's stated turn-end ordering. If a liability effect ends combat, this function stops before calling the M11 settlement step rather than trying to end a turn whose combat already ended — the same class of fix M12 made to `finishCardPlayLifecycle`, applied here proactively rather than discovered by a failing test.

## M00 implementation

- src/engine/bootstrap.ts exports the versioned, frozen bootstrap snapshot.
- src/engine/index.ts is the public engine entry point.
- src/client/App.tsx began as the M00 foundation shell and is now the M10 playable debug combat screen.
- src/main.tsx mounts the React client.
- tests/unit/engine-bootstrap.test.ts verifies the version boundary.
- tools/not-implemented.mjs gives future scripts honest nonzero exits.

Directories for future systems are created only when their first real file is
needed; M00 does not add empty-directory placeholders.

## M01 content implementation

- `schemas/*.schema.json` contains the six authoritative Draft 2020-12 schemas:
  common expressions/primitives, effects, cards, relics, enemies, and events.
- `src/content/registry.mjs` loads an explicitly supplied or default content
  set in lexical order, runs Ajv 2020 with strict/all-errors validation, then
  performs deterministic semantic checks for IDs, references, expressions,
  costs, and nested effects.
- `src/content/generated.ts` is generated from those schemas. The generator
  namespaces each schema's generated declarations so independently generated
  `$defs` cannot collide; `content:types:check` makes drift a check failure.
- `tools/validate-content/` and `tools/content-report/` expose the M01 CLI
  contracts. Test fixtures are kept under `tests/fixtures/` and are not
  production content.

The content loader depends on Ajv but the engine boundary remains unchanged:
`src/engine` does not import content, rendering, or platform code.
