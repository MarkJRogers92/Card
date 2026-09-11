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

Verification passes: `npm run check`, `npm run test:m17`, `npm run test:engine`
(277 tests), `npm run test:content`, `npm run test:properties`, and
`npm run test:replay`. The terminal-victory HP-cost regression discovered
during M17 validation was repaired by skipping trigger dispatch after a base
effect has ended combat; card lifecycle finishing still runs against that final
snapshot as designed.
