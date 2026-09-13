# M11 — Card Keyword Lifecycle, Protocols, and HP Costs

Status: **accepted**

## Scope

M11 implements the general combat lifecycle for Exhaust, Retain, Fleeting, Unplayable, and Protocol cards, plus additional self-HP card costs. It builds on the accepted M10 playable checkpoint without starting M12 Source-card production.

## Implemented contracts

- Played cards normally enter discard.
- Played cards with `exhaust` enter the exhaust zone for the rest of combat.
- Unplayed `fleeting` cards exhaust at player-turn end.
- Unplayed `retain` cards remain in hand at player-turn end.
- `fleeting` takes precedence over `retain` if both are present.
- `unplayable` cards are rejected before costs or zone movement.
- Protocol cards move to `deployed`, do not return through reshuffles, and install combat-long trigger bindings.
- Newly installed Protocol bindings do not observe the card-play event that installed them.
- Multiple Protocol copies may stack; each copy uses its own source/trigger identity and limit counters.
- Exhausted and deployed cards never enter a discard reshuffle.
- Additional HP costs resolve before base effects, bypass Block, and require enough HP to leave the payer at 1+ HP.
- Energy and all declared HP costs are prevalidated before any payment is committed.
- The existing M10 browser/headless replay checkpoint remains unchanged and is retained as a regression gate.

## Verification

Substantive M11 implementation head `8b869a26fb70be865cc08a73c9e761686a677736` passed GitHub Actions run `34536867617` on 2026-09-10.

That run passed:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- every focused M03–M11 test command
- `npm run build`
- Chromium installation
- the M10 Playwright browser/replay regression

The focused M11 suite covers play destinations, turn-end Retain/Fleeting settlement, Unplayable rejection, reshuffle exclusion, atomic HP-cost validation, Block bypass, lethal-effect cost ordering, Protocol non-retroactivity, and independent stacking Protocol copies.

## Intentional boundary

The M10 checkpoint still owns its tiny six-card debug table and its already-tested `Change of Shift` destination. M11 provides the reusable lifecycle API for production card content; M12 should use it rather than expanding M10's checkpoint-specific shortcuts.

## Next milestone

**M12 — add all 12 Source pool cards and upgrades as validated content plus targeted fixtures.** Do not begin M13 Shaper/Crew/junk-card production in M12.
