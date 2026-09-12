# Publish handoff — M21 browser persistence

Repository: `MarkJRogers92/Card`

Branch: `codex/m21-persistence`

Worktree: `/Users/markrogers/Documents/Github Code/Card/.worktrees/m21-persistence`

This handoff is resolved. M21 browser persistence was pushed to
`MarkJRogers92/Card` on `2026-09-11` and the acceptance workflow passed on the
final head.

## Push details

- Branch `codex/m21-persistence` was created from the accepted M20 head
  `e968d3e` and pushed with remote head `f5926d3`.
- GitHub Actions workflow **M21 Acceptance** run
  [`34663330230`](https://github.com/MarkJRogers92/Card/actions/runs/34663330230)
  passed at `f5926d3e59ad4b3882c9930730b2c8cf39457aca` (conclusion `success`).
- The first push (`2b1ab5a`, run `34662896299`) also passed, and an independent
  review of that state found two real defects in the rotation and selection
  rules. `f5926d3` fixes both and adds the tests that reproduce them; see
  "Review findings" below.

## What is on this branch

Commits in order:

1. `0934fc4` — `docs: add M21 browser persistence design`
2. `cc94bb4` — `feat: add M21 indexeddb save store`
3. `a8fcfc4` — `test: add M21 persistence fault injection`
4. `85764f0` — `feat: add M21 persistence browser route`
5. `2b1ab5a` — `ci: add M21 focused test script and test dependency`
6. `f846b24` — `ci: record M21 persistence acceptance`
7. `f5926d3` — `fix: harden M21 rotation and generation selection`

`src/platform/save-store.ts` owns the generation protocol (one active
generation, two rotating backups, atomic rotation, newest-valid recovery, and a
quarantine history that preserves rejected payloads). `src/platform/indexeddb.ts`
supplies the browser backend. `?fixture=m21` commits a run, reloads it, and
repairs a corrupted active record.

## Review findings folded into the final head

An independent review of `2b1ab5a` reported two defects, both verified against
the code and both now fixed:

1. **Critical — a torn commit could destroy the only good generation.** The
   commit rotated `active` and `backup.1` whenever they were structurally
   well-formed, even when their checksums failed. With `active` and `backup.1`
   corrupt and `backup.2` valid, the first write copied the corrupt record over
   the last good one, and an interruption before the final write left no
   loadable generation. Rotation now happens only for records that already
   loaded as valid generations.
2. **High — untrusted metadata could select a stale generation.** Selection
   used the highest self-reported `generation`, which is not covered by the
   save checksum, and a record's embedded `key` was not checked against its
   slot. Selection now follows slot order and rejects a mislabelled record.

The review also noted that only the first rejected slot was quarantined and
that the reward test did not interrupt the claim itself. Quarantine now keeps an
appended history of every rejection, and the suite adds the interrupted-claim,
lost-acknowledgement, corrupt-neighbour, and mislabelled-record cases.

## Local verification before the push

- `npm run check` — generated content types and `tsc --noEmit` clean.
- `npm run test:m21` — 25 focused tests passed.
- `npm run test:engine` — 336 tests passed (311 before M21).
- `npm run test:content`, `npm run content:validate`, `npm run test:replay`,
  `npm run test:properties` — all passed.
- `npm run build` — production build passed.
- `npm run test:browser` — 6 Playwright tests passed, including the new M21
  commit/reload/repair spec against real Chromium IndexedDB.

## What is on GitHub right now

- `main` — M00–M01 publication only (`33be69f`).
- `codex/m16-family-transformations` — M16–M19 checkpoints at `960000e`.
- `codex/m20-serialization` — M20 at `e968d3e`.
- `codex/m21-persistence` — M21 at `2b1ab5a` (this handoff).
- Earlier accepted milestone branches (`codex/m02`–`codex/m15`,
  `claude/m12`–`claude/m14`, `codex/m19-fixed-test-act`).

No branch has been merged into `main`, and no release was published.

## Open items carried forward

The M20 defect is unchanged: `enemy.repo_foreman` `named_claim` and
`enemy.head_of_recovery` `named_in_claim` target the placeholder
`{ kind: "locked", actorId: "source" }`, so real play cannot finish the elite or
Act 1 boss encounter and the seven-node act is not completable end to end. It
needs an M17 decision about what a locked `source` target means for an enemy.
See the "Boundary found during M20" section of
`docs/milestones/M20_SNAPSHOT_SERIALIZATION.md`.

## Tooling note

The GPT worker launcher (`~/.codex/gpt-workers/run`) requires a real `.git`
directory and therefore rejects a linked Git worktree such as
`.worktrees/m21-persistence`. Milestone work happens in worktrees by
convention, so an external worker needs either the main checkout (a different
branch) or a temporary clone of the milestone branch.

## Next

M22 is the branching two-act map: the map template, generator constraints, and
map UI, consuming the persisted `RunState` and the M21 store without changing
either.
