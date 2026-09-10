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
Energy, targeting, damage, triggers, or other authoritative state.

## M07 duo and Reaction boundary

- `src/engine/duo.ts` owns formation-derived card classification and atomic swap accounting.
- `src/engine/imprint.ts` owns the typed shared Imprint and Potency invariants.
- `src/engine/reactions.ts` owns declarative Reaction recipes and generic ordered effect resolution.
- A card-resolution context snapshots Lead/Support/Crew classification before base effects. The post-card ingredient step consumes that internal snapshot after base effects, preserving specified timing even when the card swaps formation.
- `enemySpawnOrder` is serialized separately from displayed enemy execution order and supplies deterministic primary-Reaction reacquisition.
- The M07 resolver exposes engine operations, not content-ID conditionals or UI behavior. The future card compiler will map validated card definitions into these operations.

## M08 delayed-packet boundary

- `src/engine/reactions.ts` contains all sixteen material/form recipes as declarative data consumed by the same generic resolver.
- `src/engine/scheduled.ts` owns serializable delayed Reaction packets. Packets contain only plain authoritative data and cannot contain another scheduling operation, making recursive repeats structurally unavailable.
- A delayed Reaction damage effect snapshots its amount after source-side calculation and before target-side direct-damage modifiers. Exposed is therefore reevaluated when the delayed hit lands without reapplying source-side modifiers.
- Loop packets store the selected enemy actor ID at creation. A dead delayed target fizzles; scheduled packets never use primary-Reaction spawn-order reacquisition.
- `beginPlayerTurn` clears player Block, refills Energy/resets manual swaps, resolves due player-turn-start packets, and only then draws cards. Lethal scheduled effects can therefore end combat before a new hand is drawn.
- Scheduled packet IDs use a monotonic combat-local ordinal retained in authoritative state. Consumed packet IDs are not reused.

## M09 trigger/modifier boundary

- `src/engine/triggers.ts` owns deterministic trigger eligibility, ordering, turn/combat counters, non-consuming previews, bounded dispatch, and generic modifier collection.
- Trigger ties resolve by declared priority, stable source ID, then stable trigger ID. Modifier ties use the same ordering shape with modifier ID as the final key.
- Trigger bindings and counters are authoritative combat data. Turn-scoped counters reset during `beginPlayerTurn` before scheduled M08 packets and the normal draw; combat-scoped counters persist.
- M09 enforces a 256 generated activation/effect development ceiling per dispatcher invocation and throws rather than silently truncating work. Current M09 effects cannot emit descendant trigger events, so self-reentry is structurally unavailable in this slice. Future command-level composition must carry Section 8.12 ancestry metadata and preserve the command-wide ceiling.
- `src/engine/initial-passives.ts` declares Morrow/Thick Blood, Switch/Open Channel, and Shared Warranty as bindings rather than card/relic-ID branches in gameplay resolvers.
- `src/engine/duo.ts` emits a generic `after_swap` event only after the atomic Energy/formation/manual-count state is built. A card-driven free swap can therefore trigger Shared Warranty without consuming the manual free-swap allowance.
- `src/engine/passive-card.ts` wraps the M08 post-card ingredient/Reaction resolver and emits `card_played` afterward using the already snapshotted classification. It does not reclassify after base effects.
- Modifier dispatch currently performs deterministic channel/condition selection and ordering. Arithmetic remains with the channel owner so rules such as one-final-floor damage calculation are not accidentally generalized incorrectly.
- Run- and command-scoped counter lifetime is not faked inside combat state. Those scopes are completed when the corresponding command/run orchestration exists.

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
