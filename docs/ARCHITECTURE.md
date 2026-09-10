# Architecture

## Chosen stack

The repository is one npm package: strict TypeScript, Vite, React, PixiJS 8,
JSON content, JSON Schema/Ajv validation, Vitest, fast-check, and Playwright.
The package lock is committed. Desktop and mobile adapters are later work.

## Dependency boundary

~~~text
src/engine  -> standard TypeScript only
src/client  -> React UI and future presentation adapters
src/content -> validated data and loaders (M01+)
src/platform -> browser/desktop/mobile adapters (later)
~~~

src/engine must remain independent of React, PixiJS, DOM APIs, browser storage,
and platform services. The client may import the engine boundary; the engine may
not import the client.

React owns menus and accessible controls. PixiJS will own battlefield
presentation when that adapter is introduced. Neither layer owns HP, deck order,
Energy, targeting, damage, or other authoritative state.

## M07 duo and Reaction boundary

- `src/engine/duo.ts` owns formation-derived card classification and atomic swap accounting.
- `src/engine/imprint.ts` owns the typed shared Imprint and Potency invariants.
- `src/engine/reactions.ts` owns declarative Reaction recipes and generic ordered effect resolution.
- A card-resolution context snapshots Lead/Support/Crew classification before base effects. The post-card ingredient step consumes that internal snapshot after base effects, preserving specified timing even when the card swaps formation.
- `enemySpawnOrder` is serialized separately from displayed enemy execution order and supplies deterministic primary-Reaction reacquisition.
- The M07 resolver exposes engine operations, not content-ID conditionals or UI behavior. The future card compiler will map validated card definitions into these operations.

## M00 implementation

- src/engine/bootstrap.ts exports the versioned, frozen bootstrap snapshot.
- src/engine/index.ts is the public engine entry point.
- src/client/App.tsx renders the deliberately non-playable foundation shell.
- src/main.tsx mounts the React shell.
- tests/unit/engine-bootstrap.test.ts verifies the version boundary.
- tools/not-implemented.mjs gives future scripts honest nonzero exits.

Directories for future systems are created only when their first real file is
needed; M00 does not add empty-directory placeholders.

## M01 content implementation

- `schemas/*.schema.json` contains the six authoritative Draft 2020-12 schemas:
  common expressions/primitives, effects, cards, relics, enemies, and events.
- `src/content/registry.mjs` loads an explicitly supplied or default content
  set in lexical order, runs Ajv 2020 with strict/all-errors validation, then
  performs deterministic semantic checks for IDs, references, expressions,
  costs, and nested effects.
- `src/content/generated.ts` is generated from those schemas. The generator
  namespaces each schema's generated declarations so independently generated
  `$defs` cannot collide; `content:types:check` makes drift a check failure.
- `tools/validate-content/` and `tools/content-report/` expose the M01 CLI
  contracts. Test fixtures are kept under `tests/fixtures/` and are not
  production content.

The content loader depends on Ajv but the engine boundary remains unchanged:
`src/engine` does not import content, rendering, or platform code.
