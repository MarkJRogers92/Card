# Decisions

## D-001 — One package for M00

Use one package at the repository root. There are no npm workspaces until a
later milestone demonstrates that multiple packages are necessary.

## D-002 — Pinned web stack

The exact versions below were selected from npm registry metadata on 2026-09-10
and verified against Node 24.20.0/npm 11.19.0:

| Package | Version | Role |
|---|---:|---|
| TypeScript | 7.0.2 | Strict language/tooling |
| Vite | 8.2.2 | Build/development |
| React / React DOM | 19.3.0 | Interface |
| PixiJS | 8.20.1 | Future battlefield presentation |
| Ajv | 8.20.0 | JSON Schema Draft 2020-12 validation for M01 content |
| Vitest | 5.0.0 | Unit/integration tests |
| fast-check | 4.9.0 | Future property tests |
| Playwright | 1.63.0 | Future browser tests |
| @vitejs/plugin-react | 6.1.1 | Vite React transform |
| @types/node | 22.20.2 | Node/tooling types |
| @types/react / @types/react-dom | 19.3.0 | React types |
| json-schema-to-typescript | 16.0.0 | Deterministic TypeScript declarations generated from M01 schemas |

Vite 8 and the React plugin require Node 20.19+ or 22.12+; Vitest 5
requires Node 22.12+ or Node 24+. The repository declares the compatible
Node baseline in package.json.

## D-003 — Rendering-independent engine boundary

M00 exposes only createEngineBootstrap, ENGINE_VERSION, and
CONTENT_VERSION. It imports no rendering or platform dependency and contains no
combat rules.

## D-004 — Transparent future scripts

All command names required by Section 10.5 exist in M00. Commands whose
milestones have not landed exit nonzero with a milestone-specific diagnostic;
they never falsely pass.

## D-005 — M00 scope discipline

M00 stops after repository setup, documentation, bootstrap boundary, one
meaningful unit test, and a production build. No game system or content slice is
introduced before M01.

## D-006 — Schema-first M01 content boundary

The six schema files in `schemas/` are the sole content contract. M01 includes
only common primitives/expressions, effects, cards, relics, enemies, and
events. Reactions, encounters, characters, contracts, unlocks, difficulty,
saves, and gameplay remain later-milestone surfaces.

Ajv 2020 runs with `allErrors: true`, `strict: true`, schema validation, and
unknown-field rejection. The registry expands supplied files in lexical order,
then runs semantic validation against explicit allowlists and the supplied
definition set. Diagnostics carry phase, source, JSON-pointer-style path,
keyword, stable code, and a useful message.

## D-007 — Generated types are namespaced and checked

`json-schema-to-typescript@16.0.0` is pinned in devDependencies. The generator
compiles each authoritative schema in a stable order and wraps its declarations
in a schema namespace so repeated `$defs` names such as `Effect` do not create
conflicting TypeScript declarations. `npm run check` runs the generator in
check-only mode and fails on missing or drifted output.

## D-008 — Fixtures are not production content

M01 uses authored valid and invalid fixtures to prove the validator and report
contracts. The repository intentionally has no `content/` directory yet, so a
no-argument validation/report run is an explicit empty-but-valid state rather
than an empty production-content placeholder.

## D-009 — Costs are load-time static

Every card `energyCost` and every `additionalCosts[].amount` must resolve to a
finite, safe, nonnegative integer for both the base and upgraded parameter
selections during M01 semantic validation. Cost expressions may use constants,
declared parameters, addition, and multiplication, but any `stat` reference is
rejected with an unresolved-cost diagnostic because runtime state is not
available at load time. Runtime discounts and other changes belong in validated
modifier channels. Overflow and non-safe-integer results are rejected rather
than rounded or accepted.
