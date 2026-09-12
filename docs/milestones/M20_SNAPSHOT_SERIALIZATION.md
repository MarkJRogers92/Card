# M20 — Snapshot Serialization

**Status:** local implementation checkpoint on `codex/m20-serialization`,
pushed with passing GitHub Actions run
[`34662179579`](https://github.com/MarkJRogers92/Card/actions/runs/34662179579)
(`M20 Acceptance`) at `b12cf5ab758159c57e6778aca106e047fb873eef`.

**Branch:** `codex/m20-serialization`

## Scope

M20 delivers the pure save-encoding layer: one versioned save envelope,
checksum, content snapshot, JSON export/import, and the migration contract that
later format changes plug into. It proves that an authoritative state survives
an encode/decode round trip with an identical authoritative hash, including
pending rewards, trigger counters, delayed packets, and run progress.

It adds no browser storage, no rotation or backup strategy, no profile, no map,
no Graft, and no new content. M21 owns IndexedDB, the active save, two rotating
backups, and atomic commits.

## Save envelope

`src/engine/save.ts` owns the envelope. Every exported save is canonical JSON
text:

```text
saveVersion     1 for this milestone
engineVersion   recorded for diagnostics
contentVersion  content identity the snapshot was authored against
contentHash     exact content identity the snapshot was authored against
snapshot        the authoritative state as plain JSON data
checksum        hashCanonical over the five fields above
```

The checksum uses the existing `fnv1a64-utf8-v1` canonical hash, so the same
JSON text always produces the same checksum regardless of key order or
whitespace. A checksum detects corruption; it is not anti-cheat security.

## Engine contracts

- `exportSave(state)` returns the canonical save text. Exporting is pure and
  never mutates the state it is given.
- `importSave(text, options)` returns a discriminated result instead of
  throwing: `{ ok: true, state, saveVersion, migratedFrom, warnings }` or
  `{ ok: false, code, message, saveVersion }`.
- `SAVE_SCHEMA_VERSION` is `1`; `SAVE_MIGRATIONS` is the ordered migration
  table that later format changes append to. A migration receives the parsed
  snapshot and returns a new snapshot; it never mutates its input.
- `importSave` verifies the checksum before it interprets anything, then applies
  registered migrations in order from the stored save version to the current
  one, then validates the snapshot structure and every embedded version
  constant.
- Content compatibility is explicit. When the caller supplies the running
  content identity and it differs from the stored identity, the import is
  rejected as `incompatible_content` and the original save text is left
  untouched for the caller to preserve. Reading happens through the returned
  result, never by rewriting or deleting the source.
- Import is a pure function over text. It cannot delete, overwrite, or migrate a
  stored save in place; those decisions belong to the caller and, in the
  browser, to M21.

`engineVersion` is recorded but does not gate a load, because `ENGINE_VERSION`
is a package constant rather than a rules revision. A mismatch is reported as
the `engine_version_changed` warning so a later storage layer can surface it.

## Rejected saves

`importSave` rejects, without throwing and without touching the input text:

| Code | Meaning |
|---|---|
| `malformed_json` | the text is not parseable JSON |
| `invalid_envelope` | the envelope fields are missing or the wrong type |
| `checksum_mismatch` | the checksum does not match the envelope body |
| `unsupported_save_version` | the save is newer than this engine |
| `unmigratable_save_version` | no migration path reaches the current version |
| `incompatible_content` | the caller's content identity differs from the save's |
| `incompatible_state_version` | an embedded version constant is not supported |
| `invalid_snapshot` | the snapshot structure is not an authoritative state |

## Save boundary

The engine resolves every command to completion before it returns, so a
returned authoritative state never holds an unresolved rules queue. Every
committed state is therefore an atomic save boundary, and M20 tests that
directly: after each M19 command the state can be exported and re-imported with
an unchanged authoritative hash.

## Round-trip guarantee

Save → load preserves `hashAuthoritativeState`, so it preserves RNG cursors and
draw counts, turn and trigger counters, delayed `scheduledPackets`, the shared
Imprint, installed relics, statuses, enemy controllers and intents, deck zones
and instances, Scrap, pending rewards, claimed reward IDs, and run node/HP/deck
progress.

## Browser route

`?fixture=m20` renders the M19 test act with a save panel: the canonical save
text for the current state, an import control, and a checksum field. The fixture
calls only engine commands, so the browser proves the same round trip the unit
tests prove.

## Boundaries for later milestones

- M21 owns IndexedDB persistence, one active save, two rotating backups, and
  atomic run/profile commits; it consumes this module rather than replacing it.
- M22 owns map generation. M24/M25 add the Graft schema; when that changes the
  snapshot shape they append a `SAVE_MIGRATIONS` entry and bump
  `SAVE_SCHEMA_VERSION` instead of reinterpreting an older save silently.
- Profile state is not part of the authoritative snapshot yet, so M20 does not
  encode Evidence, unlocks, or settings.

## Boundary found during M20

Driving the fixed act with an honest combat policy surfaced a defect that sits
outside M20's scope and is not caused by this milestone:

- `enemy.repo_foreman` move `named_claim` and `enemy.head_of_recovery` move
  `named_in_claim` declare `target: { kind: "locked", actorId: "source" }`.
- `resolveTargetRule` requires a locked `actorId` to be one of the two player
  character IDs, and nothing in the engine substitutes that placeholder.
- Intent selection therefore throws
  `Locked target source is not a player character.` as soon as the enemy's
  cycle reaches that move.

Reproduction: start the elite node and end the first turn.

```text
node  = elite, intent 1 = repossession (target front)   -> resolves
intent 2 = named_claim (target locked "source")          -> throws
```

The M19 suites do not catch this because they resolve the elite and boss with a
direct damage helper instead of playing the encounter; the first-turn
end-of-turn intent selection is never exercised. The elite and Act 1 boss
fights are therefore not completable by real play, and the seven-node act
cannot be finished end to end.

The M20 replay trace stops at the elite node boundary for that reason. Fixing
the enemy move requires an M17 decision about what a locked `source` target
means for an enemy, so M20 records the defect rather than inventing a rule.
