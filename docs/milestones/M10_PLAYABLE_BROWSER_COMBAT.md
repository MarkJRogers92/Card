# M10 — Minimal Playable Browser Combat

Status: **accepted**

## Scope

M10 is the first playable checkpoint. It connects a deterministic Morrow/Switch starter fight against a Claims Adjuster to a minimal React combat screen and proves that browser interaction and headless engine replay produce the same authoritative result.

M10 preserves M02–M09 deterministic state, deck/turn, vitality/status, enemy-intent, duo/Imprint/Reaction, delayed-packet, and trigger/passive contracts. It does not begin M11's general keyword lifecycle or M12/M13 production card-pool implementation.

## Checkpoint fight

The M10 fight uses the design-specified initial values:

- Morrow: 44 HP, initially Front.
- Switch: 36 HP, initially Reserve.
- Shared Warranty active.
- 3 Energy per player turn and 5-card draw.
- Ten-card starter deck: 2 Repossess, 2 Sealant, 2 Test Fire, 2 Safety Briefing, 1 Shared Cover, 1 Change of Shift.
- Claims Adjuster: 30 HP with the existing Stamp → Paperwork → Stamp Harder cycle.

The Claims Adjuster Paperwork move continues to model only its already-supported 6 Block component. Invoice generation remains M13 work.

## Engine/UI boundary

`src/engine/m10-fight.ts` owns the bounded checkpoint setup and command surface. The React UI does not implement combat arithmetic or timing. It submits three command kinds:

- `play_card`
- `swap`
- `end_turn`

Starter card effects are expressed as checkpoint data and dispatched through existing authoritative operations for Energy, attack damage, Block, card zones, free/manual swaps, Imprints, Reactions, Morrow/Switch passives, Shared Warranty, enemy execution, and turn transitions.

`Change of Shift` moves to Exhaust after play in this checkpoint. This is not the general Exhaust keyword implementation; M11 still owns Exhaust/Retain/Fleeting/Unplayable/Protocol lifecycle rules.

## Browser surface

The M10 screen exposes:

- Morrow and Switch HP/Block and Front/Reserve positions.
- Shared Imprint identity, owner, and Potency.
- Claims Adjuster target selection, HP/Block, and revealed intent.
- Energy, phase, turn, and outcome.
- Current five-card hand with owner, Lead/Support/Crew classification, cost, and ingredient.
- Manual Swap, End Turn, and Restart.
- Authoritative state hash and ordered M10 command log for deterministic verification.

## Acceptance record

GitHub Actions run `34529248894` passed the substantive M10 implementation at `f0f9296083dd3cfc7ad18c011fb9657c89571945` using Node 24.20.0 on Ubuntu.

The run passed:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- every focused M03–M10 unit/property suite
- `npm run build`
- Chromium installation for Playwright
- `npm run test:browser`

The browser suite contains two tests. The primary fixture defeats the Claims Adjuster through rendered UI controls, retrieves the exact browser command log, replays those commands through the headless M10 engine, and requires the browser and headless authoritative-state hashes to match. The second fixture verifies that Restart restores the deterministic opening hash and clears the command log.

## Next milestone

**M11 — Exhaust, Retain, Fleeting, Unplayable, Protocol deployment, and additional HP costs.**
