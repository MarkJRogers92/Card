# Status

## Current milestone

**M12 — Source card pool — accepted**

M12 is accepted on `claude/m12-source-card-pool`. GitHub Actions run
[`34539977287`](https://github.com/MarkJRogers92/Card/actions/runs/34539977287)
passed the substantive implementation at
`7b844322f4aa906b3fbb51d5662111b67cc522af`, including the complete
engine/regression stack, production build, and the M10 Chromium
browser/replay regression.

## M12 acceptance checklist

- [x] All 12 Source pool cards implemented as schema-valid production content
      under `content/cards/source/`, matching `docs/DESIGN.md` Section 3.6
      base and upgraded values exactly
- [x] No card-ID branches added to the engine; all behavior flows through
      `src/engine/card-content.ts`'s generic `effect.op` dispatch and the
      M11 lifecycle
- [x] Blood Bank and Unlicensed Procedure HP costs encoded through the card
      cost/additional-cost path, preserving pay-costs-before-base-effects
- [x] Surgical Tape (Retain) and Emergency Rebuild (Exhaust) use the M11
      keyword lifecycle directly
- [x] Thick Skin deploys and installs its Protocol trigger through the
      existing M09 trigger system; non-retroactive; independently stacking
      per copy
- [x] Unlicensed Procedure's HP cost is collected even when its damage kills
      the last enemy
- [x] Multi-hit attacks (Bone Saw, Double Take) resolve as independent hits
- [x] Lead ingredient-bearing Source cards continue to Prime/React; Support
      Source cards perform base effects without Priming or Reacting
- [x] Card conservation holds across all five zones
- [x] The two genuinely missing generic primitives (`gainEnergy`,
      `finishCardPlayLifecycle` tolerating a card's own base effect ending
      combat) are documented and covered by tests; no other primitives were
      added
- [x] Prior M00–M11 suites continue to pass, including the full M11
      lifecycle suite after the `finishCardPlayLifecycle` fix
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

## M12 verification record

`src/engine/card-content.ts` is the reusable bridge from validated
content-schema card definitions to the M03–M11 engine primitives. It owns
value-expression resolution, base/upgraded parameter resolution,
additional-HP-cost resolution, base-effect dispatch by `effect.op`, and
the `playContentCard` orchestration that composes the M07 classification
snapshot, the M11 cost/keyword/zone lifecycle, and the M07/M08
ingredient/Reaction/trigger step. It does not duplicate any of those
systems and does not branch on card ID or definition ID.

GitHub Actions run `34539977287` passed installation, type/generated-content
checks, all general unit/content/replay/property suites, every focused
M03–M12 command, production build, Chromium installation, and the M10
Playwright browser/replay regression.

The focused M12 fixtures independently verify all 12 cards at base and
upgraded values, plus the boundary/integration coverage listed in the
milestone doc (`docs/milestones/M12_SOURCE_CARD_POOL.md`).

The M10 checkpoint remains intentionally stable as a regression fixture.
Its six-card debug table was not touched or expanded; M12 content flows
through `src/engine/card-content.ts` instead.

`main` remains unchanged by M02–M12 work.

## Next eligible milestone

**M13 — add all 12 Shaper cards, 4 Crew cards, Invoice, and Fine Print.**
Reuse `src/engine/card-content.ts` and the M11 lifecycle; extend its
`effect.op` dispatch only for operations M13 content actually needs (for
example `draw`, `boost_imprint`). Do not begin M14 relic content until
M13 is accepted.
