# M13 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `claude/m13-shaper-crew-junk-pool`

Base: accepted M12 head `4cd56b45e5e91a7514207f9e487a999c40a483a8`

## Current state

M13 is accepted. The full initial 28-card draftable pool (12 Source + 12
Shaper + 4 Crew) plus Invoice and Fine Print now exist as validated
production content. M14 relic content was not started.

## Preserved contracts

- M03 deck conservation and reshuffle behavior remain authoritative.
- M04 damage/targeting math is unchanged.
- M07 Lead/Support/Crew classification remains snapshotted before base
  effects.
- M08 Imprint/Reaction/delayed-packet behavior remains unchanged.
- M09 trigger counters and non-retroactive event ordering remain
  authoritative; the new `primary_reaction` event reuses the same
  dispatcher, counter, and priority-ordering machinery as `card_played`
  and `after_swap` — no bespoke dispatch path was added.
- M10 browser/headless command parity remains green and untouched.
- M11's full keyword/cost lifecycle contract holds unchanged.
- M12's `finishCardPlayLifecycle` fix (tolerating combat that turned
  non-active during a card's own base effects) and `card-content.ts`'s
  generic `effect.op` dispatch pattern are both reused, not
  reimplemented.

## New in M13

- `content/cards/shaper/*.json` (12), `content/cards/crew/*.json` (4),
  `content/cards/junk/*.json` (2): schema-valid, passing the content
  validator.
- `src/engine/card-content.ts`: multi-target resolution
  (`all_enemies`/`both`/`front`/`reserve`), `draw`/`swap`(free)/
  `boost_imprint` dispatch, `direct`-category damage (bypasses Block via
  the existing `applyHpLossBypassingBlock`), a second compiled Protocol
  trigger shape (`after_primary_reaction`), and a new export
  `endPlayerTurnWithContentCards` for liability-card resolution.
- `src/engine/imprint.ts`: `boostImprintPotency` (no-op on a null
  Imprint; capped at `MAX_IMPRINT_POTENCY`).
- `src/engine/triggers.ts`: `"primary_reaction"` `TriggerEventKind` and
  `PrimaryReactionTriggerEvent`; `"current_front"`
  `TriggerEffectTarget`.
- `src/engine/passive-card.ts`: dispatches `primary_reaction` (when
  `resolvePostCardIngredient` produced one) before `card_played`.
- `schemas/common.schema.json`: new `"liability"` keyword (Fine Print
  only so far). Kept out of `card-lifecycle.ts`'s M11 keyword
  vocabulary on purpose — `card-content.ts` filters it before building a
  `CardLifecycleSpec`.

## Verification

Substantive M13 implementation head `c0fc846c1695886497ef6af6ea7d966ae2dd0907`
passed GitHub Actions run
[`34542002526`](https://github.com/MarkJRogers92/Card/actions/runs/34542002526).
The run passed install, type/generated-content checks, all general
unit/content/replay/property suites, every focused M03–M13 suite,
production build, Chromium installation, and the M10 Playwright
browser/replay regression. The complete M00–M12 suites were re-run
unmodified and still pass.

## Continuation rule

Begin M14 from the final accepted head of
`claude/m13-shaper-crew-junk-pool`. Add only Shared Warranty and the
Anatomy/Circuit relics through Organ Bag and Parallel Port (the first
five relic definitions per `docs/DESIGN.md` Section 3.10) as validated
production content plus modifier/trigger fixtures — `schemas/relic.schema.json`
already exists (M01) but no production relic content or relic-executor
exists yet, so expect this to need its own generic
`relic-content.ts`-shaped bridge analogous to `card-content.ts`,
dispatching `Modifier`/`Trigger` definitions onto the existing
`collectApplicableModifiers`/trigger-binding primitives in
`triggers.ts` — reuse those rather than duplicating them. Extend that
dispatch only for the specific `channel`/`condition`/`operation` shapes
M14's five relics actually need (for example Wetware Die's
`reaction.direct.multiplier` channel with a `target_has_status: bleed`
condition), add the smallest generic primitive necessary and cover it
with tests, exactly as M12/M13 did. Do not add card-ID or relic-ID
branches. Do not begin M15 (the remaining five relics) or M16 (family
transformations). Do not modify `main` unless Mark separately asks for
a merge.
