# M14 — First Relics

Status: **acceptance candidate; GitHub Actions pending**

## Scope

M14 adds the first five Section 3.10 relics as validated production
content: Shared Warranty, Wetware Die, Clot Filter, Organ Bag, and
Parallel Port. It adds only the generic modifier/trigger bridge needed
to execute those definitions and does not begin M15.

## Implemented contracts

- Shared Warranty grants 3 Block to the incoming Front after the first
  swap each player turn.
- Wetware Die multiplies Reaction direct damage by 1.5 only against a
  target that currently has Bleed; mixed-target Reactions evaluate each
  enemy independently.
- Clot Filter grants the current Front 2 Block per distinct enemy to
  which the primary Reaction applied Bleed. Its command-scoped limit is
  fresh for each Reaction, not incorrectly persisted for a turn.
- Organ Bag raises Reaction Recovery's per-combat allowance from 6 to
  10 actual HP restored.
- Parallel Port repeats the largest direct-damage packet from the first
  primary Reaction each player turn at 50% output against the same
  target. The outgoing packet is snapshotted before target modifiers;
  the repeat is floored, then current target modifiers apply. A
  no-direct-damage Reaction produces no packet and consumes the turn
  trigger.

## Generic engine surface

`src/engine/relic-content.ts` compiles validated relic modifiers and
triggers by schema fields (`channel`, `condition`, `event`, `effect.op`,
and limit), never by relic ID. Setup-time append functions allow relic
bindings to coexist with M09 character passives. The trigger runtime now
supports schema-aligned `command` scope without persisting a counter
beyond one dispatch. Reaction recovery use and Parallel Port's packet
snapshot remain authoritative combat state from the initial M14
checkpoint.

## Verification

Locally passed on 2026-09-11:

- `npm run check`
- `npm run test:engine` — 253 tests
- `npm run test:content` — 29 tests
- `npm run content:validate` — 30 cards and 5 relics valid
- `npm run test:replay`
- `npm run test:properties`
- every focused `test:m03` through `test:m14` command
- `npm run build`

The focused M14 suite contains 10 tests covering binding compilation,
coexistence with character passives, every printed relic effect,
target-dependent damage, per-target Clot accounting, Recovery limits,
and Parallel Port limits/snapshot math.

The local Playwright run could not start because this container lacked
Chromium, and the browser CDN timed out while installing it. The M14
GitHub Actions workflow installs Chromium and remains the acceptance
gate for the two unchanged M10 browser/replay regressions.

## Next milestone

M15 is the next eligible milestone only after this candidate passes the
full GitHub Actions acceptance workflow.
