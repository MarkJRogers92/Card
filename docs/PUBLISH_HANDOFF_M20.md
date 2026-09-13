# Publish handoff — M20 snapshot serialization

Repository: `MarkJRogers92/Card`

Branch: `codex/m20-serialization`

Worktree: `/Users/markrogers/Documents/Github Code/Card/.worktrees/m20-serialization`

This handoff is resolved. M20 snapshot serialization was pushed to
`MarkJRogers92/Card` on `2026-09-11` and the acceptance workflow passed.

## Push details

- Branch `codex/m20-serialization` was created from the accepted M19 head
  `960000e` and pushed with remote head `b12cf5a` (`ci: add M20 focused test
  script`).
- GitHub Actions workflow **M20 Acceptance** run
  [`34662179579`](https://github.com/MarkJRogers92/Card/actions/runs/34662179579)
  passed at `b12cf5ab758159c57e6778aca106e047fb873eef` (started
  `2026-09-12T00:37:17Z`, conclusion `success`).

## What is on this branch

Commits in order:

1. `a298440` — `docs: add M20 snapshot serialization plan`
2. `12accba` — `feat: add M20 save envelope and checksum`
3. `785f60f` — `test: add M20 save replay trace`
4. `a0fefce` — `feat: add M20 save browser route`
5. `b12cf5a` — `ci: add M20 focused test script`

`src/engine/save.ts` owns the save envelope, checksum, JSON export/import,
migration contract, and rejection taxonomy. `?fixture=m20` exports and
reimports a save in the browser and rejects a tampered one.

## Local verification before the push

- `npm run check` — generated content types and `tsc --noEmit` clean.
- `npm run test:m20` — 21 focused tests passed.
- `npm run test:engine` — 311 tests passed (292 before M20).
- `npm run test:replay`, `npm run test:content`, `npm run content:validate`,
  `npm run test:properties` — all passed.
- `npm run build` — production build passed.
- `npm run test:browser` — 5 Playwright tests passed, including the new M20
  export/import/tamper-rejection spec.

## What is on GitHub right now

- `main` — M00–M01 publication only (`33be69f`).
- `codex/m16-family-transformations` — M16–M19 checkpoints at `960000e`.
- `codex/m20-serialization` — M20 at `b12cf5a` (this handoff).
- Earlier accepted milestone branches (`codex/m02`–`codex/m15`,
  `claude/m12`–`claude/m14`, `codex/m19-fixed-test-act`).

No branch has been merged into `main`, and no release was published.

## Open item carried forward

M20's full-act trace surfaced an M17 defect that M20 deliberately did not fix:
`enemy.repo_foreman` `named_claim` and `enemy.head_of_recovery`
`named_in_claim` target the placeholder `{ kind: "locked", actorId: "source" }`,
so intent selection throws `Locked target source is not a player character.`
once the enemy cycle reaches those moves. The elite and Act 1 boss fights are
therefore not completable by real play. See the "Boundary found during M20"
section of `docs/milestones/M20_SNAPSHOT_SERIALIZATION.md` for the exact
reproduction.

## Next

M21 is browser persistence: IndexedDB, one active save, two rotating backups,
and atomic run/profile commits, consuming `src/engine/save.ts` rather than
replacing it.
