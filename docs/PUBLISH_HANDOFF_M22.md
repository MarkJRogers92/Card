# Publish handoff — M22 branching two-act map template

Repository: `MarkJRogers92/Card`

Branch: `codex/m22-map-template`

Worktree:
`/Users/markrogers/Documents/Github Code/Card/.worktrees/m22-map-template`

Head: `dd4040f28fdb04bf01e38781f5d73e36cd54e062`
(`dd4040f`, `feat: add M22 map fixture`)

Base: `34b31a4` (`codex/m21-persistence`)

## Status and publication boundary

Tasks 1-3 are implemented at the branch head. Task 4 authored this handoff and
updated the SDD ledger, but the task instruction explicitly prohibited
committing. Those two documentation files are therefore working-tree changes
on top of `dd4040f`; the branch head itself remains `dd4040f`.

M22 is local and separate from `main`. No remote branch contains `dd4040f`,
and nothing from M22 has been pushed, merged, tagged, released, or published.
Push, pull request, merge, and publication all require explicit user
authorization. If publication is later authorized, push only
`codex/m22-map-template`, run the milestone acceptance workflow on the exact
final head, and keep M22 off `main` until the user approves the acceptance
result.

## Commit sequence

- `e94b1d0` — `docs: add M22 implementation plan`
- `96e2dc5` — `feat: add deterministic M22 map graph`
- `5560ad3` — follow-up correction limited to `src/engine/map.ts` and
  `tests/unit/m22-map.test.ts`
- `2708f92` — `feat: persist M22 map navigation`
- `dd4040f` — `feat: add M22 map fixture`

## Delivered behavior

- `src/engine/map.ts` is the pure deterministic graph generator and validator.
- `RunState` persists the complete two-act map, the current map node, and the
  completed map-node walk.
- `createM22Run`, `currentReachableNodeIds`, `selectRunMapNode`, and
  `currentRunNode` own map navigation.
- `src/engine/save.ts` owns the save schema 2-to-3 migration and strict map
  navigation validation before a snapshot is accepted.
- `?fixture=m22` renders the persisted map. Act 1 nodes dispatch through
  `selectRunMapNode`; Act 2 is visible, labelled **Reserved**, and locked.

No combat, reward, rest, deck, relic, character, or content rule was moved
into UI code. No dependency or production content was added by M22.

## Map invariants

`createRunMap(seed)` uses only the existing map RNG stream and produces
`mapVersion: 1`. Both acts have seven rows and fourteen nodes with canonical
IDs `act-<act>-row-<row>-col-<column>`.

| Row | Kinds, left to right |
|---|---|
| 1 | `combat` |
| 2 | `combat`, `event`, `event` |
| 3 | `shop`, `workshop` |
| 4 | `combat`, `elite`, `combat` |
| 5 | `treasure`, `event`, `combat` |
| 6 | `rest` |
| 7 | `boss` |

The fixed forward links are:

| From | To |
|---|---|
| row 1 col 0 | row 2 cols 0, 1, 2 |
| row 2 col 0 | row 3 col 0 |
| row 2 col 1 | row 3 cols 0, 1 |
| row 2 col 2 | row 3 col 1 |
| row 3 col 0 | row 4 cols 0, 1 |
| row 3 col 1 | row 4 cols 1, 2 |
| row 4 col 0 | row 5 cols 0, 1 |
| row 4 col 1 | row 5 cols 0, 1, 2 |
| row 4 col 2 | row 5 cols 1, 2 |
| row 5 cols 0, 1, 2 | row 6 col 0 |
| row 6 col 0 | row 7 col 0 |
| row 7 col 0 | none |

The same template is materialized independently in both acts. Legal
reachability is derived from the completed prefix, not from every node in the
latest row. Each act has a reachable boss. Act 1 has four ordinary encounter
slots; each payload names an authored act 1 encounter and differs from the
immediately preceding ordinary encounter. Every Act 2 payload is
`{ kind: "reserved", content: null }`.

The focused proof runs every seed from 0 through 999 and requires:

- `validateRunMap(map)` to succeed;
- Act 1 and Act 2 bosses to be reachable;
- no consecutive duplicate ordinary encounter.

## M21 save migration

`SAVE_SCHEMA_VERSION` is 3, `AUTHORITATIVE_STATE_VERSION` is 10, and the
map-bearing `M22_RUN_VERSION` is 2.

The 2-to-3 migration is invoked by the normal `src/engine/save.ts` import path;
it does not bypass M21 persistence. For an M21 fixed-route save it:

1. Regenerates the two-act map from the persisted `run.seed`.
2. Maps the M19 route one node per row:
   `ordinary_1 -> act-1-row-1-col-0`,
   `rest_1 -> act-1-row-2-col-0`,
   `ordinary_2 -> act-1-row-3-col-0`,
   `elite -> act-1-row-4-col-0`,
   `rest_2 -> act-1-row-5-col-0`,
   `ordinary_3 -> act-1-row-6-col-0`,
   `boss -> act-1-row-7-col-0`.
3. Writes `runVersion`, `map`, `mapNodeId`, and `completedMapNodeIds`.
4. Preserves the authored `currentNodeId`, `completedNodeIds`, deck, relic,
   character, combat, and reward state.

A migrated M19 run keeps its authored node kind and encounter after migration.
For example, a save at `elite` uses `act-1-row-4-col-0` for navigation but still
starts the elite encounter, not that map node's ordinary combat payload. A save
at `boss` likewise starts the authored boss. Re-exporting a migrated state and
importing it again preserves the authoritative state hash. A version 1 save
that predates map navigation is marked fixed-route-only and skips this rung.

Strict validation rejects unknown map IDs, disconnected or duplicated
completed walks, impossible later-row jumps, and any Act 2 ID used as the
current or completed node.

## Act 2 and unsupported-content exclusions

M22 deliberately has no behavior for:

- Act 2 navigation, combat, rewards, shops, workshops, events, treasure,
  boss completion, ending, or transition;
- Act 1 event, shop, workshop, or treasure interactions.

Act 2 is rendered only as reserved and can never be selected or persisted as
current/completed. Unsupported Act 1 service nodes are rendered unavailable;
the navigation helper walks through their fixed links to the nearest playable
combat, elite, boss, or rest node without offering or accepting the service
node itself.

## Task 4 focused gate

Requested exact gate:

```sh
npm run test:m19 && npm run test:m20 && npm run test:m21 && npm run test:m22 && npx playwright test tests/browser/m22-map.spec.ts
```

Plain execution stops in `test:m19` with exit status 255 after printing the
script banner and before any test result. This is a sandbox process-launch
limit, not a test failure: `child_process.spawn("sh", ...)` fails with
`EPERM: operation not permitted`, while `child_process.spawn("/bin/sh", ...)`
succeeds. npm's default `script-shell` is `null`/`sh`.

The same gate chain with only
`npm_config_script_shell=/bin/sh` produced:

| Command | Result |
|---|---|
| `npm run test:m19` | passed: 2 files, 12 tests |
| `npm run test:m20` | passed: 2 files, 28 tests |
| `npm run test:m21` | failed before collection: `Cannot find package 'fake-indexeddb' imported from tests/unit/save-store.test.ts` |
| `npm run test:m22` | passed independently: 4 files, 53 tests |
| `npx playwright test tests/browser/m22-map.spec.ts` | not run to assertions: web server failed to start |

`fake-indexeddb@6.2.5` is declared in `package.json` and
`package-lock.json`, but it is absent from the shared `node_modules` symlink.
The task prohibited dependency installation and dependency/config changes, so
the test was not weakened and no package was installed.

Playwright initially exits 255 with no reporter output because the configured
`npm run dev` web server inherits the same relative-`sh` launch restriction.
With `npm_config_script_shell=/bin/sh`, the browser lane reaches a separate
sandbox denial:

```text
Error: listen EPERM: operation not permitted 127.0.0.1:4183
```

A direct Node `net.createServer().listen(0, "127.0.0.1")` probe fails with the
same `EPERM`. The browser assertions therefore remain unverified in this
environment. A pre-existing `test-results/.last-run.json` says `passed`, but it
was not produced by this Task 4 gate and must not be cited as Task 4 evidence.

`node_modules/.bin/tsc --noEmit` also fails on three pre-existing issues:
`tests/unit/m22-map.test.ts` imports the nonexistent type
`RunMapNodeKind` instead of `MapNodeKind`, one payload access is not narrowed,
and the missing `fake-indexeddb` package has no declarations. Type checking is
not part of the requested focused gate; these issues must be fixed in a source
task rather than hidden here.

## Recovery and publication checklist

1. On a host with outbound package access, install the locked dependencies
   (`npm ci`) only after the user authorizes that environment action.
2. Re-run the exact gate with the normal shell; do not substitute a weaker
   command. Require M19, M20, M21, M22, and the M22 Playwright spec to pass.
3. Fix only real source/test failures found by that gate. Do not weaken,
   delete, or skip assertions unless the design specification changes.
4. Inspect the final diff and decide whether to commit the two Task 4
   documentation files. Because this worker could not commit, the proposed
   message is `docs: record M22 map template handoff`; that action remains
   unauthorized here.
5. Ask the user before pushing `codex/m22-map-template`, opening a PR, merging
   into `main`, tagging, or publishing anything.
6. If authorized, push the exact reviewed head, run the M22 acceptance
   workflow, and report the workflow URL and exact commit SHA before seeking
   merge approval.

## Current working-tree note

The checkout has an untracked `node_modules` symlink to the shared temporary
install. The only Task 4 edits are this handoff and
`.superpowers/sdd/2026-09-12-m22-map-template/progress.md`. No source, test,
package, config, lockfile, or root-checkout file was changed.
