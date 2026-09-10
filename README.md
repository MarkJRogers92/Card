# Joint Liability

This repository contains the browser-first foundation for *Joint Liability*, a
single-player roguelike deckbuilder about two medically inseparable fugitives.
The complete design snapshot is preserved in [docs/DESIGN.md](docs/DESIGN.md).

M00 is intentionally not a playable game. It establishes the strict TypeScript,
Vite, React, PixiJS, JSON Schema/Ajv, Vitest, fast-check, and Playwright
toolchain; the rendering-independent engine version boundary; and the
documentation/task contract for later milestones.

## Requirements

Use a supported Node/npm pair. The validated baseline is Node 24.20.0 with npm
11.19.0. The package engine range also accepts the compatible Node 22.12+
baseline required by the current Vite/Vitest toolchain.

## Commands

~~~text
npm ci
npm run check
npm run test:engine
npm run build
~~~

The future command surface is present now so automation can depend on stable
names. Commands for milestones after M00 exit nonzero with an explicit
not-implemented message until their milestone is delivered.
