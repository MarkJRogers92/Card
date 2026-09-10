# Status

## Current milestone

**M01 — content schemas and validator**

M01 preserves the M00 repository, locked dependency graph, operating contract,
minimal browser shell, and rendering-independent engine boundary while adding
schema-first content validation for cards, relics, enemies, events, and shared
effects. No production content or game systems are included.

## Acceptance checklist

- [x] Clean install (npm ci)
- [x] Generated types are committed and drift-checked
- [x] Structural and semantic validator uses strict Ajv 2020/allErrors
- [x] Valid fixtures cover all four definition kinds and all effect operations
- [x] Invalid fixtures cover unknown fields, IDs, parameters, operations,
  references, predicates, expression depth, effect payloads, static cost
  constraints, and required trigger filters
- [x] Focused content suite (npm run test:content)
- [x] Engine regression suite (npm run test:engine)
- [x] Content validation and report CLI smokes
- [x] Typecheck (npm run check)
- [x] Production build (npm run build)
- [x] Future command names fail transparently until implemented

## Verification record

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
  with an explicit planned-milestone message. M01 now owns test:content and
  content:report.

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

The accepted local implementation ends at `67249386`. On 2026-09-10, the full
accepted repository tree was published to `MarkJRogers92/Card` on GitHub
`main`. GitHub is now the shared source for continuation in other tasks.

## Next eligible milestone

**M02 — authoritative state, versioned RNG streams, command IDs, canonical
hashing, and basic event records.** Keep gameplay in the engine boundary and
preserve M01 schema/registry contracts.
