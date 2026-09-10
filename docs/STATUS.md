# Status

## Current milestone

**M02 — authoritative engine foundation**

M02 preserves the accepted M00/M01 repository and content-validation contracts
while adding deterministic authoritative state, versioned RNG streams, command
IDs, canonical hashing, basic event records, and executable replay/property
acceptance tests. No card-zone or combat behavior is included yet.

## M02 acceptance checklist

- [x] Authoritative state is rendering- and platform-independent
- [x] Versioned seeded PRNG implementation is committed
- [x] Gameplay RNG streams are independent for map, encounter, combat, reward,
  and event selection
- [x] Cosmetic RNG is separate from authoritative gameplay RNG
- [x] Command IDs are deterministic and sequence-derived
- [x] Basic event record IDs are deterministic and command-scoped
- [x] Canonical serialization and versioned deterministic hashing are implemented
- [x] 100 repeated seeded command sequences produce identical final hashes
- [x] Interleaved cosmetic randomness does not affect gameplay results
- [x] Property-based isolation checks pass
- [x] Clean install, typecheck, engine/content tests, replay/property tests, and
  production build pass in GitHub Actions

## M00 verification record

M00 was validated on 2026-09-10 with Node 24.20.0 and npm 11.19.0:

- npm install — PASS; generated the committed lockfile; 70 packages added and
  0 vulnerabilities reported.
- npm ci — PASS; clean lockfile install; 71 packages added and 0
  vulnerabilities reported. npm warned that fsevents install scripts remain
  unapproved; this is an npm policy warning, not a failed install.
- npm run check — PASS; strict TypeScript check completed with no diagnostics.
- npm run test:engine — PASS; 1 test file and 1 test passed.
- npm run build — PASS; Vite 8.2.2 produced dist/ successfully.
- Future script smoke — EXPECTED NONZERO; test:replay, test:browser,
  test:properties, simulate -- --seeds 1000, and assets:audit each returned 1
  with an explicit planned-milestone message. M01 later took ownership of
  test:content and content:report.

## M01 verification record

Validated on 2026-09-10 with Node 24.20.0 and npm 11.19.0:

- `npm ci` — PASS; clean lockfile install added 82 packages and reported 0
  vulnerabilities. npm warned that the fsevents install script remains
  unapproved; the install still completed successfully.
- `npm run check` — PASS; generated-type drift check and strict TypeScript
  completed with no diagnostics.
- `npm run test:content` — PASS; the focused suite covers authored positive and
  negative schema, semantic, cost, reference, and trigger cases.
- `npm run content:validate -- tests/fixtures/valid` — PASS; one valid card,
  relic, enemy, and event loaded.
- `npm run content:validate -- tests/fixtures/invalid/cards/unknown-field.json`
  — EXPECTED NONZERO (exit 1); emitted the exact `/unexpected` path and
  `unknown_field` code.
- `npm run content:report -- tests/fixtures/valid -- --json` — PASS after
  machine-readable parsing; report status valid, four definitions, and zero
  diagnostics. The equivalent invalid-reference report exited 1 and marked
  the event invalid at `/choices/0/effects/0/cardId`.
- `npm run test:engine` — PASS; 1 file and 1 test passed.
- `npm run build` — PASS; Vite 8.2.2 produced `dist/` successfully.
- Future script smoke — EXPECTED NONZERO; `test:replay`, `test:browser`,
  `test:properties`, `simulate -- --seeds 1000`, and `assets:audit` each
  returned 1 with an explicit not-implemented message.
- Re-running `npm run content:types` produced the committed generated file
  SHA-256 `179a980087c9accb459b2662090153e74e9d792c2d9c1aff69ec079d952f66c2`.
- `docs/DESIGN.md` remains byte-identical to the supplied specification
  attachment (SHA-256 `e91f61fe50a37e09221b318e04eed0af70b4e7da5d756f30df37528b640e511a`).

The accepted M00/M01 repository tree was published to `MarkJRogers92/Card` on
GitHub `main` on 2026-09-10. GitHub is the shared continuation source.

## M02 verification record

M02 was implemented on `codex/m02-engine-foundation` and accepted on 2026-09-10.
GitHub Actions run `34478451729` completed successfully using a standard Ubuntu
GitHub-hosted runner with Node 24.20.0.

The acceptance run passed:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- `npm run build`

The M02 replay suite repeats 100 seeded 80-command sequences and requires
identical gameplay samples, event IDs, RNG state, and authoritative-state hashes.
It repeats the same sequences with cosmetic RNG noise interleaved and requires
identical gameplay results. The property suite independently verifies gameplay
RNG isolation from cosmetic draws.

`main` has not been changed by M02 work.

## Next eligible milestone

**M03 — deck cycling, Energy, hand cap, card zones, and turn transitions.** M03
must preserve M02 deterministic-state and RNG contracts and remain inside the
rendering-independent engine boundary.
