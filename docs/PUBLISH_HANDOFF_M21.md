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

None. The M20 locked-target defect is resolved on this branch, on
`codex/m20-serialization`, and on `codex/m16-family-transformations`: a Locked
enemy move authored with `LOCKED_AT_REVEAL_ACTOR_ID` names the character
occupying Front when the intent is revealed and stores that character in the
selected intent, so swapping never redirects the attack. The elite and Act 1
boss now resolve through the real `applyM19Command` surface. See the "Locked
enemy targeting" section of `docs/milestones/M17_INITIAL_ENEMIES.md`.

## Follow-up correction — M17 locked enemy targeting

Commits `648be20` (this branch), `08e5ea8` (`codex/m20-serialization`), and
`74f9584` (`codex/m16-family-transformations`) carry the same correction, each
with a docs commit on top. Every branch's acceptance workflow passed:

| Branch | Head | Run |
|---|---|---|
| `codex/m16-family-transformations` | `b170a10` | [`34664233324`](https://github.com/MarkJRogers92/Card/actions/runs/34664233324) |
| `codex/m20-serialization` | `b54e5b0` | [`34664229423`](https://github.com/MarkJRogers92/Card/actions/runs/34664229423) |
| `codex/m21-persistence` | `3376123` | [`34664229323`](https://github.com/MarkJRogers92/Card/actions/runs/34664229323) |

## Tooling note

The GPT worker launcher (`~/.codex/gpt-workers/run`) requires a real `.git`
directory and therefore rejects a linked Git worktree such as
`.worktrees/m21-persistence`. Milestone work happens in worktrees by
convention, so an external worker needs either the main checkout (a different
branch) or a temporary clone of the milestone branch.

## Follow-up — Act 1 first pass

Commit `e6562e5` (`fix: carry card rewards into the run deck and play content
cards`) closes the M18→M19 handoff gap found while playing through Act 1.
GitHub Actions run
[`34664952428`](https://github.com/MarkJRogers92/Card/actions/runs/34664952428)
passed at `e6562e527353fa2e29e664c5e1444fdde125fe2d`.

Found and fixed:

- A claimed card reward only recorded an id, so the pick had no effect. It now
  becomes a deck instance carried into every later node.
- The act refused any definition outside the M10 starter set, and the browser
  had no runtime content source. `src/content/bundle.ts` collects the
  checked-in JSON for the browser and tests, and content cards play through
  `playContentCard`.
- A deck containing content cards now settles Retain, Fleeting, Exhaust, and
  unplayable junk through the M11 lifecycle; starter-only decks keep the
  original end-turn path, so existing traces and hashes are unchanged.

Still open, in priority order:

1. The boss victory reward omits the design's 5 Evidence (M29) and the
   post-boss heal of 8 for each character (Act 2 transition, M22).
2. The starting loadout's Suture Kit consumable is not implemented (M23/M26).
3. Balance: the elite is a real difficulty check. The first-pass playthrough
   wins `ordinary_1` in 2 turns and `ordinary_2` in 3, then loses the elite on
   turn 5 to a policy that does not use Retain, handoffs, or Imprints well.
   That is expected for an unguarded damage race and belongs to the difficulty
   pass rather than this fix.

Relics were the top item on that list and are now wired: see "Relic rewards" in
`docs/milestones/M19_FIXED_TEST_ACT.md`. `RunState.relicIds` carries owned
relics, `beginRunNode` installs the claimed ones during combat setup, an owned
relic is never offered again, and the run state change ships with
`AUTHORITATIVE_STATE_VERSION` 9 and `SAVE_SCHEMA_VERSION` 2 plus the first
`SAVE_MIGRATIONS` rung. Commits `57f0e2d` and `35b05b5`; GitHub Actions run
[`34665513977`](https://github.com/MarkJRogers92/Card/actions/runs/34665513977)
passed at `35b05b5fb46078e9eea3db613b13fb4cafdd3d23`.

## Next

M22 is the branching two-act map: the map template, generator constraints, and
map UI, consuming the persisted `RunState` and the M21 store without changing
either.
