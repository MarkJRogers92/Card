# M15 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `codex/m15-remaining-relics`

Base: the M14 head on `claude/m14-first-relics` plus the M14 hardening commits
that could not be pushed from the M14 environment.

## Current state

M15 is **implemented and locally verified**, but **not pushed and not CI
accepted**. The full local stack passes, including the M10 browser regression.

The two unpushed branches are stacked:

1. `claude/m14-first-relics` — M14 acceptance plus
   `23927b9 fix(engine): reject duplicate relic installation` and
   `82227aa docs: record M14 duplicate-relic hardening`.
2. `codex/m15-remaining-relics` — this milestone, branched from (1).

Because the local GitHub credential is read-only (`403`), neither branch
could be pushed. Push them in order and confirm M14 Acceptance and M15
Acceptance are green before continuing.

## Accepted M15 scope

The remaining five Section 3.10 relics — Refund Capacitor, Arc Welder,
Counterfeit Seal, Carbon Copy, and Blank Badge — implemented as validated
production content plus the generic primitives described in
`docs/milestones/M15_REMAINING_RELICS.md`. No relic-ID branches were added.

## Deferred by design

- Blank Badge's reward-option count is exposed by `cardRewardOptionCount`;
  M18's reward engine consumes it.
- Counterfeit Seal keys off the `grafted` card tag; M24/M25 Grafting authors
  that tag on generated cards.
- No engine work for M16 family transformations was started.

## Continuation rule

M16 — the three family transformations — is eligible once M15 is accepted.
Do not merge `main` as part of this handoff, and continue only from an
accepted M15 head.
