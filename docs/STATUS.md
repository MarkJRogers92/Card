# Status

## Current milestone

**M10 — minimal playable browser combat — accepted**

M10 is accepted on `codex/m10-playable-combat`. GitHub Actions run `34529248894` passed the substantive browser checkpoint at `f0f9296083dd3cfc7ad18c011fb9657c89571945`, including the first real Playwright combat acceptance.

## M10 acceptance checklist

- [x] Browser opens directly into a deterministic Morrow/Switch vs Claims Adjuster fight
- [x] Starter 10-card deck is represented with real authoritative card instances/zones
- [x] Hand displays owner, Lead/Support/Crew classification, Energy cost, and ingredient
- [x] Enemy target, HP/Block, and selected intent are visible
- [x] Morrow/Switch HP, Block, and Front/Reserve state are visible
- [x] Manual Swap uses the M07/M09 atomic swap + Shared Warranty path
- [x] Starter card plays use real Energy, attack damage, Block, Imprint, Reaction, and passive operations
- [x] End Turn resolves the real enemy phase and begins the next player turn when combat remains active
- [x] Restart reconstructs the deterministic opening state and clears the UI command log
- [x] Browser command log replays headlessly to the exact same authoritative-state hash
- [x] Scripted Playwright fight defeats the Claims Adjuster through real UI controls
- [x] Prior M00–M09 suites continue to pass
- [x] Production build passes

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

## M10 verification record

`src/engine/m10-fight.ts` is a bounded checkpoint orchestration layer for the six starter definitions and the Claims Adjuster fixture. It composes existing authoritative engine operations rather than putting rules in React. The UI submits the same `play_card`, `swap`, and `end_turn` commands used by the headless replay path.

GitHub Actions run `34529248894` passed installation, type/generated-content checks, every general and focused M03–M10 engine suite, the production build, Chromium installation, and two Playwright browser tests. The main browser fixture wins the Claims Adjuster fight through rendered controls, reads the resulting command log, replays it headlessly, and requires the final authoritative hashes to match exactly.

M10 intentionally does not implement the general keyword lifecycle. `Change of Shift` uses a checkpoint-local post-play exhaust destination only; Exhaust/Retain/Fleeting/Unplayable/Protocol rules remain M11 work. Claims Adjuster's Invoice insertion remains deferred to M13 as previously specified.

`main` remains unchanged by M02–M10 work.

## Next eligible milestone

**M11 — Exhaust, Retain, Fleeting, Unplayable, Protocol deployment, and additional HP costs.** Preserve the M10 browser/headless command parity and do not begin M12 card-pool production until M11 is accepted.
