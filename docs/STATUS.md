# Status

## Current milestone

**M05 — enemy move cycles and fixed intents**

M05 builds on accepted M02–M04 deterministic state, deck/turn, HP/Block, and targeting infrastructure. It adds deterministic enemy controllers, revealed intent snapshots, intent projection, displayed-order enemy execution, and next-intent selection. Statuses, escalation, Reactions, and later content-effect operations remain out of scope.

## M05 acceptance checklist

- [x] Initial intents selected before first player turn
- [x] Cycle and opening-cycle selection deterministic
- [x] Claims Adjuster repeats `stamp → paperwork → stamp_harder`
- [x] Front/Reserve targets remain dynamic until execution
- [x] Locked target remains fixed after formation changes
- [x] Revealed move/effect snapshot cannot be rewritten by later definition/phase changes
- [x] Living enemies execute in explicit displayed order
- [x] Next intents selected only after current enemy phase execution
- [x] Next player turn blocked until enemy phase resolves
- [x] Prior M00–M04 suites continue to pass
- [x] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted 2026-09-10 on `codex/m02-engine-foundation`; GitHub Actions run `34478451729` passed the locked M02 suite and production build.
- **M03 — deck, Energy, and turn foundation**: accepted 2026-09-10 on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623` passed prior suites, focused M03 tests, and production build.
- **M04 — HP, Block, damage, and targeting**: accepted 2026-09-10 on `codex/m04-hp-damage-targeting`; final GitHub Actions run `34496069587` passed prior suites, focused M04 tests, and production build.

## M05 verification record

M05 was implemented on `codex/m05-enemy-intents` and accepted on 2026-09-10. GitHub Actions run `34498372266` passed the substantive implementation at commit `dcd7f434` using Node 24.20.0 on a standard Ubuntu GitHub-hosted runner.

The acceptance run passed:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- `npm run test:m03`
- `npm run test:m04`
- `npm run test:m05`
- `npm run build`

The focused M05 fixtures verify pre-player intent reveal, deterministic cycle and opening-cycle behavior, Claims Adjuster's three-move sequence, dynamic Front targeting, persistent Locked targeting, immutable revealed move/effect snapshots across later definition changes, displayed-order execution, and the enemy-phase completion gate before the next player turn.

M05 intentionally executes only the prior-milestone primitives needed for controller validation: direct damage and self Block. The Claims Adjuster Paperwork move's Invoice insertion remains deferred until the roadmap introduces Invoice content and the appropriate generic card-effect path; no content-ID special case was added.

`main` remains unchanged by M02–M05 work.

## Next eligible milestone

**M06 — Bleed, Poison, Weak, Exposed, and escalation timing.** M06 must preserve fixed revealed intents while adding status timing, damage modifiers, duration expiry, and the phase-7 anti-stall Strength escalation.
