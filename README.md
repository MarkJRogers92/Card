# Joint Liability

This repository contains the browser-first foundation for *Joint Liability*, a
single-player roguelike deckbuilder about two medically inseparable fugitives.
The complete design snapshot is preserved in [docs/DESIGN.md](docs/DESIGN.md).

M00 and M01 are complete. The project now includes the strict TypeScript/Vite
foundation, rendering-independent engine boundary, authoritative Draft 2020-12
content schemas, generated types, Ajv structural and semantic validation,
deterministic validation/report commands, and focused fixtures. It is
intentionally not playable yet; combat state begins in M02.

## Requirements

Use a supported Node/npm pair. The validated baseline is Node 24.20.0 with npm
11.19.0. The package engine range also accepts the compatible Node 22.12+
baseline required by the current Vite/Vitest toolchain.

## Commands

~~~text
npm ci
npm run check
npm run test:engine
npm run test:content
npm run build
~~~

See [docs/STATUS.md](docs/STATUS.md) for the accepted milestone, verification
evidence, and next entry point. Commands for later milestones exit nonzero with
an explicit not-implemented message until their milestone is delivered.
