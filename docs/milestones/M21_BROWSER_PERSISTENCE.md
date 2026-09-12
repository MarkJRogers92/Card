# M21 — Browser Persistence

**Status:** local implementation checkpoint on `codex/m21-persistence`, branched
from the accepted M20 head `e968d3e`, pushed with passing GitHub Actions run
[`34662896299`](https://github.com/MarkJRogers92/Card/actions/runs/34662896299)
(`M21 Acceptance`) at `2b1ab5a`.

**Branch:** `codex/m21-persistence`

## Scope

M21 delivers the browser persistence adapter: one IndexedDB database, one active
generation, two rotating backups, an atomic commit, recovery from a damaged
generation, and fault-injection tests that interrupt a write at every
transaction boundary.

It adds no map, no shop, no profile semantics, no Evidence, no settings, no
cloud sync, no encryption, and no new content. M22 owns the branching map,
M23 owns purchases and consumables, and M29 owns the profile, Evidence, unlocks,
and discovery tracking that will reuse the profile payload this milestone
reserves but leaves empty.

## Storage model

One database, one object store, four slots:

```text
database   joint-liability
store      saves          (keyPath: key)
slots      active         the current generation
           backup.1       the previous generation
           backup.2       the generation before that
           quarantine     the most recent record rejected on load
```

Each slot holds a plain JSON-cloneable record:

```text
key         the slot name
generation  monotonic counter, starts at 1 for the first commit
text        the canonical M20 save text for that generation
profile     opaque platform payload reserved for M29; null in M21
```

`src/engine/save.ts` remains the only encoder. M21 consumes `exportSave` and
`importSave` and never reimplements the envelope, the checksum, or the
migration table.

## Commit protocol

A commit writes the repository's `active`/`backup.1`/`backup.2` rotation in one
atomic transaction, in this order:

1. `backup.2` ← the current `backup.1`
2. `backup.1` ← the current `active`
3. `active` ← the new generation

Two properties follow from that ordering:

- The new generation is written last, so no legal interruption can leave
  `active` pointing at a generation whose backups have not been written.
- Backups are written before the record they protect, so a backend that loses
  atomicity (a torn write) can only damage `backup.2` or `backup.1`, each of
  which is already superseded by `active` at the moment it is replaced.

A commit is a single authoritative state. Because the engine resolves every
command to completion before returning, any returned state is a legal save
boundary; M20 records that property and M21 relies on it.

The M21 commit path does not accept prepared statements, partial patches, or
deltas. A generation is written whole or not at all.

## Load and recovery protocol

Load reads all three generation slots, validates every present record with
`importSave`, and selects the valid record with the highest generation
(ties resolve to `active`). Recovery never throws and never deletes.

- **All three slots valid and consistent** — the newest generation loads.
- **One or more slots invalid, at least one valid** — the newest valid
  generation loads, and the store repairs itself: the rejected text is copied
  into `quarantine` and the recovered record is rewritten into `active`, both
  in one atomic transaction. The corrupt payload is therefore preserved for a
  later diagnosis instead of being overwritten or dropped.
- **No slot valid** — the result is `no_valid_generation` with the per-slot
  rejection reasons. Nothing is written and nothing is deleted.
- **No slot present** — the result is `empty`, which is the normal first-run
  state and not an error.

If the repair write itself fails, the recovered state is still returned; the
result reports that the on-disk repair was deferred, and the next successful
commit performs the same rotation. Recovery never depends on a write
succeeding.

## Failure taxonomy

`load` returns a discriminated result rather than throwing:

```text
ok: true                        state, slot, generation, rejected[], repairedOnDisk
ok: false, code: empty                 nothing has been written yet
ok: false, code: no_valid_generation   every present slot was rejected
ok: false, code: unavailable           IndexedDB is missing or the read failed
```

`commit` returns:

```text
ok: true                        generation
ok: false, code: encode_failed        the state could not be encoded
ok: false, code: write_failed         the transaction aborted; nothing changed
ok: false, code: unavailable          IndexedDB is missing or the write failed
```

A failed commit never updates the caller's authority. The caller keeps the
state it already had, which is exactly the generation that remains on disk.

## Backend seam and fault injection

`src/platform/save-store.ts` owns the protocol and depends on a four-method
`SaveBackend` (`read`, `commit`, `close`). `src/platform/indexeddb.ts` supplies
the IndexedDB implementation.

The seam exists for three reasons: IndexedDB must not leak into `src/engine`,
later desktop and mobile milestones need different storage substrates, and
crash behaviour must be testable rather than assumed.

The IndexedDB backend accepts an optional `beforeWrite` observer that runs
inside the live transaction. Fault-injection tests use it to abort a genuine
IndexedDB transaction after a chosen number of writes, then assert that the
aborted commit changed nothing.

The tests exercise two interruption shapes at every boundary:

- **Abort** — the real IndexedDB transaction is aborted after write *n*. The
  commit rejects, and a fresh load returns the previous generation with
  `backup.1`/`backup.2` untouched.
- **Torn** — a test backend applies the first *n* writes as separate
  transactions and then fails, simulating a substrate that lost atomicity. The
  commit rejects, and a fresh load still returns a complete, valid generation
  because the rotation order never removes the record it protects before the
  replacement exists.

Both shapes assert the same user-visible invariant: a run reloads to a valid
generation and a claimed reward is never applied twice, because a generation is
written whole and reward claims are already idempotent by transaction ID inside
the snapshot.

## Run and profile atomicity

The commit writes one generation record, and that record carries both the run
save text and the opaque profile payload. Run and profile therefore cannot
diverge: an interrupted commit leaves both at the previous generation, and a
successful commit advances both together. M21 tests that with a profile payload
present, so the M29 Evidence/unlock work inherits a proven atomic boundary
instead of inventing one.

M21 does not define what the profile payload means. It stores and returns it
unchanged.

## Browser route

`?fixture=m21` renders the M19 test act with a persistence panel: the current
generation and slot, a `Save now` control, a `Load from storage` control, a
`Reset storage` control, and a status line that reports the load source and
whether a repair happened. The fixture calls only engine commands plus the M21
store, so the browser proves the same protocol the unit tests prove.

## Boundaries for later milestones

- M22 owns map generation and consumes the persisted `RunState` unchanged.
- M23 owns purchases and consumables, which commit through the same store.
- M24/M25 add the Graft schema; when the snapshot shape changes they append a
  `SAVE_MIGRATIONS` entry and bump `SAVE_SCHEMA_VERSION`, and M21's loader picks
  the migration up without changes.
- M29 owns profile semantics, Evidence, unlocks, and discovery tracking inside
  the reserved profile payload.
- Electron and Capacitor adapters replace only the backend, not the protocol.

## Open item carried forward

The M20 defect recorded in
`docs/milestones/M20_SNAPSHOT_SERIALIZATION.md` is unchanged by M21:
`enemy.repo_foreman` `named_claim` and `enemy.head_of_recovery`
`named_in_claim` target the placeholder `{ kind: "locked", actorId: "source" }`,
so real play cannot finish the elite or Act 1 boss encounter. M21's tests drive
combat with the existing direct-damage shortcut and therefore stay unaffected,
but the act is still not completable end to end by honest play.

## Local verification

- `npm run check` — generated content types and `tsc --noEmit` clean.
- `npm run test:m21` — 21 focused persistence tests passed, including the abort
  and torn-write cases at every transaction boundary.
- `npm run test:engine` — 332 tests passed (311 before M21).
- `npm run test:content`, `npm run content:validate`, `npm run test:replay`,
  `npm run test:properties` — all passed.
- `npm run build` — production build passed.
- `npm run test:browser` — 6 Playwright tests passed, including the new M21
  commit/reload/repair spec against real Chromium IndexedDB.
