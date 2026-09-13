# M11 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `codex/m11-keyword-lifecycle`

Base: accepted M10 head `105369de44b1cafa11ec5cdaf093becc01e24198`

## Current state

M11 is accepted. The engine now has the reusable card lifecycle for Exhaust, Retain, Fleeting, Unplayable, Protocol deployment, and additional HP costs. M12 Source-card production was not started.

## Preserved contracts

- M03 deck conservation and reshuffle behavior remain authoritative.
- M07 Lead/Support/Crew classification remains snapshotted before base effects.
- M07/M09 swap accounting and trigger ordering remain unchanged.
- M08 Imprint/Reaction/delayed-packet behavior remains unchanged.
- M09 trigger counters and non-retroactive event ordering remain authoritative.
- M10 browser/headless command parity remains green and the checkpoint UI remains a frozen regression fixture.
- Unplayable cards are rejected before costs or movement.
- Energy and all self-HP costs are prevalidated before payment; HP costs resolve before base effects, bypass Block, and must leave at least 1 HP.
- Played Exhaust cards enter exhaust; Protocols enter deployed; neither returns through discard reshuffles.
- At player-turn end, Fleeting cards exhaust, Retain cards stay in hand, and all other unplayed cards discard.
- Protocol bindings install after the installing card event, so they cannot trigger retroactively on their own deployment.
- Protocol copies may stack through distinct per-instance binding identities and counters.

## Verification

Substantive M11 implementation head `8b869a26fb70be865cc08a73c9e761686a677736` passed GitHub Actions run `34536867617`. The run passed install, type/generated-content checks, all general unit/content/replay/property suites, every focused M03–M11 suite, production build, Chromium installation, and the M10 Playwright browser/replay regression.

## Continuation rule

Begin M12 from the final accepted head of `codex/m11-keyword-lifecycle`. Add only the 12 Source pool cards and their upgrades from `docs/DESIGN.md` as validated production content plus targeted fixtures. Reuse M11 lifecycle and existing effect primitives; do not add card-ID branches. Do not begin M13 Shaper/Crew/Invoice/Fine Print production. Do not modify `main` unless Mark separately asks for a merge.
