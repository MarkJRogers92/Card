# M12 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `claude/m12-source-card-pool`

Base: accepted M11 head `b40c0cc00e1cfabb1846241a9589c2eabb824c64`

## Current state

M12 is accepted. All 12 Source pool cards from `docs/DESIGN.md` Section 3.6
exist as validated production content, and the engine has its first generic
content-driven card executor. M13 Shaper/Crew/Invoice/Fine Print production
was not started.

## Preserved contracts

- M03 deck conservation and reshuffle behavior remain authoritative.
- M04 damage/targeting math (`calculateAttackDamage`, floor-once-at-the-end
  rounding) is unchanged; M12 content flows through it rather than
  reimplementing it.
- M07 Lead/Support/Crew classification remains snapshotted before base
  effects; Support Source cards perform base effects without Priming or
  Reacting.
- M07/M09 swap accounting and trigger ordering remain unchanged.
- M08 Imprint/Reaction/delayed-packet behavior remains unchanged.
- M09 trigger counters and non-retroactive event ordering remain
  authoritative; Thick Skin's Protocol trigger is expressed entirely
  through the existing `card_owner`/`classification` trigger conditions,
  no new condition kind was added.
- M10 browser/headless command parity remains green and the checkpoint UI
  remains a frozen regression fixture; M12 does not touch or extend it.
- M11's full keyword/cost lifecycle contract holds: Unplayable cards are
  rejected before costs or movement; Energy and all self-HP costs are
  prevalidated before payment; HP costs resolve before base effects,
  bypass Block, and must leave at least 1 HP; Exhaust/Protocol/Retain/
  Fleeting all behave exactly as M11 specified; Protocol bindings install
  after the installing card event and may stack independently per copy.

## New in M12

- `content/cards/source/*.json`: the 12 Source cards, schema-valid,
  passing the content validator.
- `src/engine/card-content.ts`: the generic content-card executor
  (`resolveValueExpr`, `resolveCardParameters`, `resolveAdditionalHpCosts`,
  `cardLifecycleSpecFor`, `applyCardBaseEffects`, `playContentCard`).
  Currently implements only the `effect.op` values and the
  `after_source_lead` Protocol trigger event that M12's content actually
  uses; extend its dispatch only when new content genuinely needs a new
  operation, and never by branching on a card ID.
- `combat.ts`: added `gainEnergy` (generic inverse of `payEnergyCost`).
- `card-lifecycle.ts`: `finishCardPlayLifecycle` now tolerates combat that
  turned non-active during the same card's own base-effect resolution
  (`requireCombatForFinish`), so a non-Protocol card's own lethal effect
  can still complete its M11 finish step. Protocol cards are unaffected:
  they still require active combat and the deployed zone to install.

## Verification

Substantive M12 implementation head `7b844322f4aa906b3fbb51d5662111b67cc522af`
passed GitHub Actions run
[`34539977287`](https://github.com/MarkJRogers92/Card/actions/runs/34539977287).
The run passed install, type/generated-content checks, all general
unit/content/replay/property suites, every focused M03–M12 suite,
production build, Chromium installation, and the M10 Playwright
browser/replay regression. The full M11 suite was independently re-run
after the `finishCardPlayLifecycle` change and still passes unmodified.

## Continuation rule

Begin M13 from the final accepted head of `claude/m12-source-card-pool`.
Add only the 12 Shaper cards, 4 Crew cards, Invoice, and Fine Print from
`docs/DESIGN.md` Sections 3.7–3.9 as validated production content plus
targeted fixtures. Reuse `src/engine/card-content.ts` and the M11
lifecycle; extend `applyCardBaseEffects`'s dispatch only for operations
M13 content genuinely needs (for example `draw` for Cross Examination/
Switchblade/Overclock, `boost_imprint` for Reservoir, a second
Protocol-trigger event such as `after_primary_reaction` for Operating
Manual) — add the smallest generic primitive necessary and cover it with
tests, exactly as M12 did for `gainEnergy` and the
`finishCardPlayLifecycle` fix. Do not add card-ID branches. Do not begin
M14 relic content. Do not modify `main` unless Mark separately asks for a
merge.
