# M17 — initial enemies and encounters

M17 adds the authored Act 1 enemy registry and initial ordinary encounter
formations. The shared enemy controller now supports generated cards placed in
discard, immutable selection-time HP threshold bonuses, and generic living-enemy
death effects.

- Claims Adjuster adds a temporary Invoice to discard.
- Taxidermy Drone, Compliance Slug, Unpaid Intern, and Repo Foreman have their
  specified repeating move cycles.
- The Unpaid Intern grants 2 Strength to each other living enemy when it dies.
- Head of Recovery has its four-move cycle; Personal Involvement is captured
  only when a later intent is selected at 75 HP or below, so a revealed intent
  never changes underneath the player.
- The five Act 1 ordinary formations are authored, and the first-encounter pool
  is mechanically restricted to the single-enemy formations.

## Locked enemy targeting

Section 2.7 defines a Locked intent as one that "names a specific character
when the intent is revealed" and that swapping does not redirect. The Repo
Foreman's `named_claim` (Locked 14) and the Head of Recovery's `named_in_claim`
(Locked 18) name no particular character in the design text, so they author
`LOCKED_AT_REVEAL_ACTOR_ID` (`"source"`) and `selectIntent` substitutes the
character occupying Front at selection time. The selected intent stores that
character, so a swap during the player turn moves the named character to
Reserve but never redirects the attack, and the intent stays immutable exactly
like an authored Locked character ID.

Before this rule existed the marker reached `resolveTargetRule`, which threw
`Locked target source is not a player character` as soon as either cycle
reached those moves. The elite and Act 1 boss could not be played at all, and
the M19 seven-node act could not be completed past `ordinary_3`; M20 recorded
that boundary and deliberately stopped its trace there.

Both encounters now resolve through the real `applyM19Command` surface. Driven
by the damage-only test policy they last five (elite) and six (boss) player
turns and end in defeat, which is a balance outcome for an unguarded damage
race rather than an engine error; the rule itself is covered directly by
`tests/unit/initial-enemies.test.ts` and `tests/unit/m19-run.test.ts`.

Verification passes: `npm run check`, `npm run test:m17`, `npm run test:engine`
(277 tests), `npm run test:content`, `npm run test:properties`, and
`npm run test:replay`. The terminal-victory HP-cost regression discovered
during M17 validation was repaired by skipping trigger dispatch after a base
effect has ended combat; card lifecycle finishing still runs against that final
snapshot as designed.
