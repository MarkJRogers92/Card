# M14 — First Relics

Status: **accepted**

Accepted implementation commit:
`2221c093c6cca649b62a8d811188e0fba3a2ce2b`

GitHub Actions acceptance run:
[`34548620092`](https://github.com/MarkJRogers92/Card/actions/runs/34548620092)

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

The local Playwright run could not start because the local container
lacked Chromium and its CDN timed out while installing it. That
environmental gap is now closed by the exact-head GitHub Actions
acceptance run below.

### Exact GitHub Actions acceptance

Workflow: **M14 Acceptance**

Run: [`34548620092`](https://github.com/MarkJRogers92/Card/actions/runs/34548620092)

Exact head SHA:
`2221c093c6cca649b62a8d811188e0fba3a2ce2b`

Conclusion: **success**

The acceptance job passed:

- Install locked dependencies
- Type and generated-content checks
- Engine tests
- Content tests
- Production content validation
- Replay determinism tests
- Engine property tests
- Focused M03–M14 tests
- Production build
- Install Chromium for browser regression
- M10 browser replay regression

No tests were weakened and the stable M10 browser fixture remained
unchanged.

## Next milestone

M15 — remaining relics — is eligible after this acceptance, but it is not
started by the M14 documentation-only acceptance record.
