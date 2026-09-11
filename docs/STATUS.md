# Status

## Current milestone

**M14 — first relics — accepted**

M14 is accepted on `claude/m14-first-relics`. GitHub Actions run
[`34548620092`](https://github.com/MarkJRogers92/Card/actions/runs/34548620092)
passed the exact implementation head
`2221c093c6cca649b62a8d811188e0fba3a2ce2b`, including installation,
type/generated-content checks, general engine/content/validation/replay/
property suites, focused M03–M14 tests, production build, Chromium
installation, and the unchanged M10 browser/replay regression.

M14 completes Shared Warranty, Wetware Die, Clot Filter, Organ Bag, and
Parallel Port as validated production content plus a generic relic-content
compiler. See `docs/milestones/M14_FIRST_RELICS.md` and
`docs/M14_NORMAL_CHAT_HANDOFF.md` for the exact contracts and evidence.

## M14 acceptance checklist

- [x] Shared Warranty grants 3 Block to the incoming Front after the first swap each player turn
- [x] Wetware Die multiplies Reaction direct damage by 1.5 only against targets currently carrying Bleed, including mixed-target evaluation
- [x] Clot Filter grants the current Front 2 Block per distinct enemy to which the primary Reaction applied Bleed, with command-scoped limiting
- [x] Organ Bag raises Reaction Recovery's per-combat actual-healing allowance from 6 to 10
- [x] Parallel Port repeats the largest direct-damage packet from the first primary Reaction each player turn at 50% output against the same target, with the accepted snapshot/floor/current-target-modifier ordering
- [x] Relic execution is compiled generically from validated schema fields rather than relic-ID branches
- [x] Relic bindings coexist with M09 character passives
- [x] A relic whose source is already bound in the combat is rejected rather than stacked (duplicate Shared Warranty)
- [x] Prior accepted suites continue to pass
- [x] Production build passes
- [x] M10 Playwright browser/replay regression remains green

Post-acceptance hardening commit `23927b9` adds the duplicate-source guard
and its focused test. It passes the full local stack above, including the
M10 browser regression, but it is **not yet pushed**: the local GitHub
credential is read-only (`403`), so the M14 Acceptance workflow has not run
at that head. See `docs/milestones/M14_FIRST_RELICS.md`.

## Last accepted milestone before M14

**M13 — Shaper, Crew, and junk card pool — accepted**

M13 is accepted on `claude/m13-shaper-crew-junk-pool`. GitHub Actions run
[`34542002526`](https://github.com/MarkJRogers92/Card/actions/runs/34542002526)
passed the substantive implementation at
`c0fc846c1695886497ef6af6ea7d966ae2dd0907`, including the complete
engine/regression stack, production build, and the M10 Chromium
browser/replay regression.

## M13 acceptance checklist

- [x] All 12 Shaper cards, 4 Crew cards, Invoice, and Fine Print
      implemented as schema-valid production content, matching
      `docs/DESIGN.md` Sections 3.7–3.9 base and upgraded values exactly
- [x] No card-ID branches added to the engine
- [x] Fan Service/Broad Hint correctly hit every living enemy
- [x] Draw effects (Switchblade, Cross Examination, Overclock, Cross
      Training) and free-swap effects (Switchblade, Sudden Exit) work
      through existing deck/duo primitives
- [x] Double Booking's varying Ingredient Prime (2 base / 3 upgraded)
      Primes the Imprint correctly
- [x] Operating Manual deploys, installs its Protocol through the
      trigger system, targets whoever is currently Front (not its own
      owner), respects a once-per-turn limit, and stacks independently
      across copies
- [x] Reservoir boosts existing Imprint Potency (capped at 3) and is a
      documented no-op with no existing Imprint; Retain preserved
- [x] Fine Print's turn-end hand-liability HP loss (bypassing Block)
      resolves before the M11 Fleeting/Retain/discard settlement, for
      one or many copies, including the case where it ends the run
- [x] Invoice remains fully inert and unplayable
- [x] Card conservation holds across all zones with the new content
- [x] The five genuinely missing generic primitives (multi-target
      resolution, `draw`/`swap`/`boost_imprint` dispatch, `direct`-category
      damage, the `primary_reaction` Protocol event, and the `liability`
      keyword) are documented and covered by tests; no other primitives
      were added
- [x] Prior M00–M12 suites continue to pass unmodified
- [x] Production build passes
- [x] M10 Playwright browser/headless hash parity remains green

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted on `codex/m02-engine-foundation`; GitHub Actions run `34478451729`.
- **M03 — deck, Energy, and turn foundation**: accepted on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623`.
- **M04 — HP, Block, damage, and targeting**: accepted on `codex/m04-hp-damage-targeting`; final GitHub Actions run `34496069587`.
- **M05 — enemy move cycles and fixed intents**: accepted on `codex/m05-enemy-intents`; final GitHub Actions run `34498521927`.
- **M06 — status timing and escalation**: accepted on `codex/m06-status-timing`; final GitHub Actions run `34501385073`.
- **M07 — duo handoffs, Imprints, and Needle Reactions**: accepted on `codex/m07-imprint-needle-reactions`; final GitHub Actions run `34506507341`.
- **M08 — remaining Reactions and serializable delayed packets**: accepted on `codex/m08-reactions-delayed-packets`; final GitHub Actions run `34524502196`.
- **M09 — bounded trigger/modifier dispatch and initial passives**: accepted on `codex/m09-trigger-passives`; final GitHub Actions run `34526337720`.
- **M10 — minimal playable browser combat**: accepted on `codex/m10-playable-combat`; final head `105369de44b1cafa11ec5cdaf093becc01e24198` passed GitHub Actions run `34529482114`.
- **M11 — card keyword lifecycle, Protocols, and additional HP costs**: accepted on `codex/m11-keyword-lifecycle`; final head `b40c0cc00e1cfabb1846241a9589c2eabb824c64` passed GitHub Actions run `34537126146`.
- **M12 — Source card pool**: accepted on `claude/m12-source-card-pool`; final head `4cd56b45e5e91a7514207f9e487a999c40a483a8` passed GitHub Actions run `34540152598`.

## M13 verification record

`src/engine/card-content.ts` gained multi-target resolution
(`all_enemies`/`both`/`front`/`reserve`, reusing `targeting.ts`), and
dispatch for `draw`, `swap` (free mode), `boost_imprint`, and
`direct`-category `damage` (routed through the existing
`applyHpLossBypassingBlock`). `src/engine/imprint.ts` gained
`boostImprintPotency`. `src/engine/triggers.ts` gained a second Protocol
trigger event kind, `"primary_reaction"` (dispatched from
`passive-card.ts` alongside the existing `card_played` dispatch,
whenever a primary Reaction actually resolved), and a `"current_front"`
trigger effect target. `schemas/common.schema.json` gained a
`"liability"` keyword, resolved by a new `card-content.ts` export,
`endPlayerTurnWithContentCards`, that runs before the unmodified M11
`endPlayerTurnWithCardLifecycle`. None of these branch on card ID, and
none altered any previously accepted behavior — the complete M00–M12
suites were re-run and still pass unmodified.

GitHub Actions run `34542002526` passed installation,
type/generated-content checks, all general unit/content/replay/property
suites, every focused M03–M13 command, production build, Chromium
installation, and the M10 Playwright browser/replay regression.

The focused M13 fixtures independently verify all 16 real cards plus
Invoice and Fine Print at base and upgraded values, plus the
boundary/integration coverage listed in the milestone doc
(`docs/milestones/M13_SHAPER_CREW_JUNK_POOL.md`).

The M10 checkpoint remains intentionally stable as a regression fixture
and was not touched.

## M14 verification record

`src/engine/relic-content.ts` compiles validated relic modifiers and
triggers generically by schema fields (`channel`, `condition`, `event`,
`effect.op`, and limit), with setup-time append functions that allow relic
bindings to coexist with the accepted M09 character passives. The trigger
runtime supports schema-aligned `command` scope without persisting a counter
beyond one dispatch. Reaction Recovery use and Parallel Port's packet
snapshot remain authoritative combat state from the initial M14 checkpoint.
No relic-ID branches were added.

GitHub Actions run `34548620092` passed at exact implementation commit
`2221c093c6cca649b62a8d811188e0fba3a2ce2b`. The single acceptance job
completed successfully across all steps, including the focused M03–M14
suite, production build, Chromium installation, and M10 browser/replay
regression.

`main` remains unchanged by M02–M14 work.

## Next eligible milestone

**M15 — remaining relics** is now eligible because M14 is accepted, but it
has not been started in this acceptance-record commit.
