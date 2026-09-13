# M13 — Shaper, Crew, and Junk Card Pool

Status: **accepted**

## Scope

M13 implements the remaining initial 28-card draftable pool: all 12
Shaper cards, all 4 Crew cards, and the two negative/generated cards
(Invoice, Fine Print), from `docs/DESIGN.md` Sections 3.7–3.9, as
validated production content. It builds on the accepted M12 Source pool
and the M11 lifecycle without starting M14 relic content.

## Implemented content

- `content/cards/shaper/*.json` — 12 cards (Nail Driver, Fan Service,
  Collection Notice, Scheduled Violence, Switchblade, Insulated Coat,
  Cross Examination, Broad Hint, Friendly Leech, Double Booking,
  Overclock, Operating Manual), matching Section 3.7 exactly.
- `content/cards/crew/*.json` — 4 cards (Cover Both, Cross Training,
  Reservoir, Sudden Exit), matching Section 3.8.
- `content/cards/junk/*.json` — Invoice and Fine Print, matching Section
  3.9; both `graftEligible: false` and both have identical base/upgraded
  parameter values everywhere, matching "Neither can be upgraded or
  Grafted."
- Nail Driver, Cross Examination, Double Booking, and Operating Manual
  are Switch's four signature cards; the remaining eight Shaper cards
  and all four Crew cards belong to the shared pool. `unlockId` records
  the "Unscheduled Work" (Switchblade, Double Booking) and "Office
  Equipment" (Overclock, Operating Manual) packs per Section 4.3; the
  other 20 cards across M12+M13 are `null` (available from the start).
  This reproduces the design's "20 of the 28 draftable cards" and "36
  Evidence" totals exactly, though the unlock-tree system itself remains
  later work (M29).

## New generic engine surface

All additions are the smallest necessary primitive for content this
milestone actually needs, dispatched generically (never by card ID), and
covered by tests:

- **Multi-target effect resolution** (`src/engine/card-content.ts`):
  `all_enemies` (Fan Service, Broad Hint) and `both`/`front`/`reserve`
  (Cover Both, Sudden Exit, Fine Print) targets, reusing the existing
  `targeting.ts` primitives (`resolveTargetRule`) rather than
  reimplementing formation logic.
- **`draw` and `swap` effect ops**: dispatch straight to the existing
  `deck.ts` `drawCards` and `duo.ts` `swapCharacters` (free mode only —
  no M13 card needs a paid card-driven swap, so that mode throws a clear
  "unsupported" error rather than being guessed at).
- **`damage` with `category: "direct"`**: routes through the existing
  `applyHpLossBypassingBlock` (the same primitive Bleed/Poison ticks and
  self-HP costs already use) instead of the attack-damage formula. This
  is what makes Fine Print's Block-bypassing HP loss possible, and is a
  general capability, not specific to that card.
- **`boost_imprint` effect op and `imprint.ts`'s `boostImprintPotency`**:
  adds Potency to an existing Imprint only, capped at 3, ingredient
  identity untouched. A `null` Imprint is a documented no-op rather than
  a throw: the card schema has no card-level eligibility/requirement
  mechanism yet (unlike events' `Predicate`), so Reservoir's "Requires an
  Imprint" is a content-authoring note today, not an engine-enforced
  precondition. Revisit if/when card play-eligibility gating is
  implemented.
- **A second Protocol trigger event, `"primary_reaction"`**
  (`src/engine/triggers.ts`, dispatched from `passive-card.ts` whenever
  `resolvePostCardIngredient` produced a primary Reaction, before the
  existing `card_played` dispatch), plus a `"current_front"` trigger
  effect target that reads the event's own captured `frontActorId`. This
  is what lets Operating Manual's "Front gains Block" correctly target
  whoever is currently Front — not its own Shaper owner — and let it
  stack independently and respect a once-per-turn limit exactly like
  Thick Skin's `after_source_lead` Protocol from M12.
- **A new content keyword, `"liability"`** (`schemas/common.schema.json`,
  regenerated `src/content/generated.ts`), for Fine Print. It is
  deliberately not part of `card-lifecycle.ts`'s M11 keyword vocabulary —
  `cardLifecycleSpecFor` filters it out before constructing a
  `CardLifecycleSpec`, so the M11 lifecycle itself is unchanged and
  unaware of it. It is resolved by a new `card-content.ts` export,
  `endPlayerTurnWithContentCards`, which runs each in-hand liability
  card's own effects (Fine Print: 1 HP loss to Front, bypassing Block)
  before delegating to the existing, unmodified
  `endPlayerTurnWithCardLifecycle`, matching `docs/DESIGN.md` Section
  2.8's turn-end ordering ("Resolve player end-of-turn effects, including
  Fine Print" happens before Fleeting/Retain/discard settlement). A
  liability effect can end combat (it is HP loss that bypasses Block,
  like Bleed or Poison); the new function stops before the M11 settlement
  step in that case rather than trying to end a turn whose combat is no
  longer active.

## Verification

Substantive M13 implementation head `c0fc846c1695886497ef6af6ea7d966ae2dd0907`
passed GitHub Actions run
[`34542002526`](https://github.com/MarkJRogers92/Card/actions/runs/34542002526)
on 2026-09-10, covering:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- every focused M03–M13 test command
- `npm run build`
- Chromium installation
- the M10 Playwright browser/replay regression

The focused M13 suite (`npm run test:m13`,
`tests/unit/shaper-crew-junk-pool.test.ts`, 38 tests) independently
verifies every card's base and upgraded outputs, Fan Service/Broad Hint
hitting every living enemy, the draw effects on Switchblade/Cross
Examination/Overclock/Cross Training, Switchblade/Sudden Exit's free swap
plus Block on the new Front, Double Booking's Prime-2/Prime-3 Imprint
creation, Operating Manual's deployment/non-owner Front-targeting/
once-per-turn limit/independent stacking, Reservoir's Potency boost
(including the capped-at-3 boundary and the no-Imprint no-op) plus
Retain, Cover Both's both-target Block, Invoice's inert
unplayable+fleeting behavior, Fine Print's turn-end HP loss while in hand
(single copy, multiple copies, and the lethal case where turn-end
resolution stops gracefully instead of throwing), and card conservation
across a mixed play including a liability effect. It also loads and
validates the real `content/` directory — now 30 cards — against the
registry. The complete M03–M12 suites were re-run unmodified and still
pass.

## Intentional boundary

M13 adds no card-ID branches anywhere in the engine, and does not touch
the frozen M10 checkpoint. Invoice and Fine Print's "Generated only for
the current combat" — how a real enemy move would add a temporary
instance to a player's deck via the `add_card` effect — is explicitly
out of scope: M13 only needed their own printed mechanics to be
expressible and correct once an instance exists, which this content and
its fixtures establish directly. `add_card`, `schedule_packet`,
`repeat_packet`, `gain_scrap`, `gain_evidence`, `change_standing`,
`set_flag`, `remove_card`, `upgrade_card`, and Protocol trigger events
other than `after_source_lead`/`after_primary_reaction` remain
unimplemented in `card-content.ts` and throw a clear "unsupported" error;
extend that dispatch only when new content actually needs one of them.

## Next milestone

**M14 — add Shared Warranty and the Anatomy/Circuit relics through Organ
Bag and Parallel Port** (the first five relic definitions, per
`docs/DESIGN.md` Section 3.10) as validated production content plus
modifier/trigger fixtures. Do not begin M15 (the remaining five relics)
until M14 is accepted.
