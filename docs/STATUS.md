# Status

## Current milestone

**M11 — card keyword lifecycle, Protocols, and additional HP costs — accepted**

M11 is accepted on `codex/m11-keyword-lifecycle`. GitHub Actions run `34536867617` passed the substantive implementation at `8b869a26fb70be865cc08a73c9e761686a677736`, including the complete engine/regression stack, production build, and the M10 Chromium browser/replay regression.

## M11 acceptance checklist

- [x] Played Exhaust cards enter the exhaust zone for the remainder of combat
- [x] Unplayed Fleeting cards exhaust at player-turn end
- [x] Retain cards remain in hand at player-turn end
- [x] Fleeting takes precedence over Retain when both are present
- [x] Unplayable cards are rejected before costs or zone movement
- [x] Protocol cards move to deployed and never return through reshuffles
- [x] Protocol triggers install after the installing card event and therefore do not trigger retroactively
- [x] Multiple Protocol copies stack through distinct per-instance trigger identities and limits
- [x] Exhausted and deployed cards never enter discard reshuffles
- [x] Additional HP costs bypass Block and require at least 1 HP remaining
- [x] Energy and all declared HP costs are prevalidated before any payment is committed
- [x] HP costs are collected before base effects, including lethal base effects
- [x] Prior M00–M10 suites continue to pass
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

## M11 verification record

`src/engine/card-lifecycle.ts` is the reusable M11 lifecycle boundary. It owns keyword validation, playability checks, additional Energy/HP cost collection, post-play zone destination, Protocol trigger installation, and player-turn-end hand settlement. It composes the existing M03–M10 deck, damage, trigger, Imprint, Reaction, and turn systems rather than duplicating them.

GitHub Actions run `34536867617` passed installation, type/generated-content checks, all general unit/content/replay/property suites, every focused M03–M11 command, production build, Chromium installation, and the M10 Playwright browser/replay regression.

The focused M11 fixtures cover normal/Exhaust/Protocol play destinations, Retain/Fleeting end-turn settlement, Unplayable rejection, reshuffle exclusion, atomic HP costs, Block bypass, lethal-effect cost ordering, Protocol non-retroactivity, and independent stacking Protocol copies.

The M10 checkpoint remains intentionally stable as a regression fixture. Its six-card debug table is not expanded into the production card pool; M12 should use the M11 lifecycle surface for new Source content rather than growing checkpoint-specific shortcuts.

`main` remains unchanged by M02–M11 work.

## Next eligible milestone

**M12 — add all 12 Source pool cards and upgrades.** Use validated content plus targeted fixtures, reuse the M11 lifecycle and existing effect primitives, and do not begin M13 Shaper/Crew/Invoice/Fine Print production until M12 is accepted.
