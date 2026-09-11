# Status

## Current milestone

**M15 — remaining relics — accepted**

M15 is accepted on `codex/m15-remaining-relics`. GitHub Actions run
[`34557264949`](https://github.com/MarkJRogers92/Card/actions/runs/34557264949)
passed the exact head `295af4a5ddd719afacccb58343bced9a4bac0b16`.
The acceptance job passed locked dependency installation, generated-content/
type checks, general engine/content/validation/replay/property suites, every
focused M03–M15 command, production build, Chromium installation, and the
unchanged M10 browser/replay regression.

M15 completes Refund Capacitor, Arc Welder, Counterfeit Seal, Carbon Copy, and
Blank Badge as validated production content plus the generic limited resource,
cost, delayed-repeat, Imprint reinforcement, and reward-option surfaces those
definitions require. See `docs/milestones/M15_REMAINING_RELICS.md` and
`docs/M15_NORMAL_CHAT_HANDOFF.md` for the exact contracts.

## M15 acceptance checklist

- [x] Refund Capacitor grants 1 Energy only after the first Potency-3 primary Reaction each player turn
- [x] Arc Welder adds 1 Potency when reinforcing an existing Volt Imprint, still capped at 3
- [x] Counterfeit Seal discounts the first Grafted card played each player turn by 1 Energy, minimum 0
- [x] Carbon Copy schedules one extra 50% next-turn repeat of the first primary Loop Reaction each player turn, with per-output flooring and zero suppression
- [x] Blank Badge raises the generic card-reward option count from 3 to 4
- [x] No relic-ID branches were added; effects compile from schema fields
- [x] Counterfeit Seal uses the normal trigger limit/counter machinery rather than a second turn-counter system
- [x] Carbon Copy uses serializable scheduled packets and cannot recursively copy its own extra repeat
- [x] M15 remains correctly bounded: M18 consumes Blank Badge and M24/M25 author the `grafted` tag
- [x] Prior M00–M14 suites continue to pass
- [x] Production build passes
- [x] M10 Playwright browser/replay regression remains green

## Previous accepted milestone

**M14 — first relics — accepted**

M14's original acceptance evidence remains GitHub Actions run
[`34548620092`](https://github.com/MarkJRogers92/Card/actions/runs/34548620092)
at implementation commit `2221c093c6cca649b62a8d811188e0fba3a2ce2b`.
It completed Shared Warranty, Wetware Die, Clot Filter, Organ Bag, and Parallel
Port plus the generic relic-content compiler.

The later duplicate-relic hardening is included in the accepted M15 history and
therefore is also covered by M15 run `34557264949`; duplicate relic sources are
rejected rather than silently stacked.

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
- **M13 — Shaper, Crew, and junk card pool**: accepted on `claude/m13-shaper-crew-junk-pool`; substantive head `c0fc846c1695886497ef6af6ea7d966ae2dd0907` passed GitHub Actions run `34542002526`.

## M15 verification record

The accepted M15 implementation extends the schema/content-driven relic model
rather than introducing relic-specific branches. `card_play_cost` provides a
generic pre-payment trigger surface; primary-Reaction events carry the Potency,
Material/Form, and delayed packet data needed by remaining relics; Volt
reinforcement and reward-option count use dedicated generic modifier channels;
and optional validated card tags provide the future Grafted-card hook.

GitHub Actions run `34557264949` passed at exact head
`295af4a5ddd719afacccb58343bced9a4bac0b16`, including all general suites,
focused M03–M15 tests, production build, Chromium installation, and the M10
browser/replay regression.

The M10 checkpoint remains intentionally stable as a regression fixture and
was not touched.

`main` remains unchanged by M02–M15 milestone work.

## Next eligible milestone

**M16 — relic-family transformations** is now eligible because M15 is accepted.
It has not been started in this acceptance-record commit.
