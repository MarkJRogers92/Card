# M15 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `codex/m15-remaining-relics`

Accepted head: `295af4a5ddd719afacccb58343bced9a4bac0b16`

Accepted GitHub Actions run: [`34557264949`](https://github.com/MarkJRogers92/Card/actions/runs/34557264949)

Base: the accepted M14 line plus the duplicate-relic hardening that is included
in the accepted M15 history.

## Current state

M15 is **accepted**. GitHub Actions run `34557264949` passed at the exact head
`295af4a5ddd719afacccb58343bced9a4bac0b16`. The acceptance job completed
installation, generated-content/type checks, general engine/content/validation/
replay/property suites, every focused M03-M15 command, production build,
Chromium installation, and the unchanged M10 browser/replay regression.

## Accepted M15 scope

The remaining five Section 3.10 relics — Refund Capacitor, Arc Welder,
Counterfeit Seal, Carbon Copy, and Blank Badge — are implemented as validated
production content plus the generic primitives described in
`docs/milestones/M15_REMAINING_RELICS.md`. No relic-ID branches were added.

- Refund Capacitor grants 1 Energy only after the first Potency-3 primary
  Reaction each player turn.
- Arc Welder adds 1 Potency when reinforcing an existing Volt Imprint, capped
  at 3.
- Counterfeit Seal discounts the first Grafted card each player turn by 1
  Energy, minimum 0, through the generic card-play cost event/tag path.
- Carbon Copy schedules one extra 50% next-turn repeat of the first primary
  Loop Reaction each player turn with per-output flooring and zero suppression.
- Blank Badge raises the generic card-reward option count from 3 to 4.

## Deferred by design

- Blank Badge's reward-option count is exposed by `cardRewardOptionCount`;
  M18's reward engine consumes it.
- Counterfeit Seal keys off the `grafted` card tag; M24/M25 Grafting authors
  that tag on generated cards.
- No M16 family-transformation implementation was started as part of M15.

## Continuation rule

M16 — the three family transformations — is now eligible.

Do not merge `main` unless the user explicitly requests it. Continue from the
accepted M15 documentation head produced by the acceptance-record commit, on a
fresh M16 branch. Do not fold M16 implementation into the M15 acceptance
record.
