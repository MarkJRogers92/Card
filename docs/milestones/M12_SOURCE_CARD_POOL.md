# M12 — Source Card Pool

Status: **accepted**

## Scope

M12 implements all 12 Source pool cards and their upgrades from
`docs/DESIGN.md` Section 3.6 as validated production content, using the
M11 card lifecycle and existing M03–M09 engine primitives. It builds on
the accepted M11 lifecycle without starting M13 Shaper/Crew/Invoice/
Fine Print production.

## Implemented content

`content/cards/source/*.json` — 12 schema-valid card definitions (Open
Wound, Spoiled Sample, Bone Saw, Ground Fault, Double Take, Blood Bank,
Surgical Tape, Controlled Decay, Tenderize, Emergency Rebuild, Thick
Skin, Unlicensed Procedure), each with base and upgraded parameters
matching Section 3.6 exactly.

- Blood Bank and Unlicensed Procedure encode their owner-HP payments
  through the card `additionalCosts` path, preserving the M11 contract:
  pay/validate costs → base effects → Reaction/Imprint → finish card.
- Surgical Tape (`retain`) and Emergency Rebuild (`exhaust`) use the M11
  keyword lifecycle directly; no bespoke handling was added.
- Thick Skin is a genuine Protocol: it deploys to the `deployed` zone and
  installs a per-instance "after a Source Lead card" trigger through the
  existing M09 trigger system (`card_owner` + `classification` conditions
  bound to its own owner at play time), non-retroactively, with
  independent stacking across copies.
- Open Wound, Bone Saw, Thick Skin, and Unlicensed Procedure are the four
  initial Morrow signature cards; the other eight belong to the initial
  shared Source pool, per Section 3.6.
- `unlockId` is recorded per Section 4.3 (Blood Bank/Unlicensed Procedure
  behind "Unsafe Practice"; Ground Fault/Double Take behind "Alternate
  Current"; the remaining eight `null`), even though the unlock-tree
  system itself remains later work (M29), so that milestone does not need
  to revisit this content.

## New generic engine surface

- `src/engine/card-content.ts` is the first generic bridge from validated
  content-schema card definitions (`schemas/card.schema.json`) to the
  M03–M11 engine primitives. It resolves value expressions and
  base/upgraded parameters, resolves additional HP costs and the M11
  `CardLifecycleSpec`, and dispatches base effects purely on `effect.op`
  (`damage`, `apply_status`, `block`, `heal`, `gain_energy`,
  `install_protocol`) through the existing damage, status, and trigger
  primitives — never on a card ID. `playContentCard` composes
  `snapshotCardResolutionContext` → `assertCardPlayable` → `payCardCosts`
  → `movePlayedCardForLifecycle` → base effects → `finishCardPlayLifecycle`,
  and is reusable by any future content-defined card, not just Source
  cards.
- `combat.ts` gains `gainEnergy`, the inverse of the existing
  `payEnergyCost`: a generic primitive Blood Bank's "Gain 1 Energy" needs
  that did not previously exist anywhere in the engine.
- `card-lifecycle.ts`'s `finishCardPlayLifecycle` no longer requires combat
  to still be active at entry. A non-Protocol card's own lethal base
  effect (Unlicensed Procedure killing the last enemy) could previously
  never reach its M11 finish step at all, because the entry guard
  unconditionally rejected a non-active outcome. The accepted M11 suite
  never exercised this combination: its own lethal-cost test stops
  immediately after the base effect and never calls
  `finishCardPlayLifecycle`. The fix (`requireCombatForFinish`) tolerates
  a combat that just turned non-active during this same card's own
  resolution, while still rejecting a genuinely missing or wrongly-phased
  combat. Every previously accepted M11 behavior, including Protocol
  installation timing and non-retroactivity, is unchanged — the full M11
  suite (`npm run test:m11`) still passes without modification.

## Verification

Substantive M12 implementation head `7b844322f4aa906b3fbb51d5662111b67cc522af`
passed GitHub Actions run
[`34539977287`](https://github.com/MarkJRogers92/Card/actions/runs/34539977287)
on 2026-09-10, covering:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- every focused M03–M12 test command
- `npm run build`
- Chromium installation
- the M10 Playwright browser/replay regression

The focused M12 suite (`npm run test:m12`, `tests/unit/source-card-pool.test.ts`)
independently verifies every card's base and upgraded outputs, proves
Bone Saw/Double Take resolve as independent multi-hit attacks (via
Strength applying per hit rather than once to a combined packet),
verifies the combined Strength/Weak/Exposed attack-damage formula,
Tenderize's damage-before-Exposed effect ordering, Blood Bank's HP
payment/Energy gain/Exhaust at both levels, Surgical Tape's Retain into
the next turn, Emergency Rebuild's heal cap at maximum HP, Thick Skin's
deployment/non-retroactivity/once-per-turn limit/independent stacking
across copies, Unlicensed Procedure's HP-cost-before-lethal-damage
(including the cost still being collected when the attack kills the last
enemy), Lead-vs-Support Priming/Reaction behavior through the real M07/M08
system, and card conservation across all five zones. It also loads and
validates the real `content/` directory against the registry.

## Intentional boundary

M12 adds no card-ID branches anywhere in the engine. It does not add
Shaper, Crew, Invoice, or Fine Print content, and does not touch or
extend the frozen M10 checkpoint (`src/engine/m10-fight.ts`), which
remains a browser regression fixture only. `src/engine/card-content.ts`
currently only implements the base-effect operations and Protocol-trigger
shapes the 12 Source cards actually use; unsupported operations (`draw`,
`swap`, `boost_imprint`, `add_card`, `schedule_packet`, `repeat_packet`,
`gain_scrap`, `gain_evidence`, `change_standing`, `set_flag`,
`remove_card`, `upgrade_card`, and Protocol trigger events other than
`after_source_lead`) throw a clear, explicit error rather than silently
no-opping; M13+ should extend this module's dispatch as new content
actually needs those operations, rather than duplicating a parallel
executor.

## Next milestone

**M13 — add all 12 Shaper cards, 4 Crew cards, Invoice, and Fine Print** as
validated production content plus targeted fixtures, reusing
`src/engine/card-content.ts` and the M11 lifecycle. Do not begin M14
relic content until M13 is accepted.
