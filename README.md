# Joint Liability

This repository contains the browser-first foundation for *Joint Liability*, a
single-player roguelike deckbuilder about two medically inseparable fugitives.
The complete design snapshot is preserved in [docs/DESIGN.md](docs/DESIGN.md).

M00 through M14 are accepted, and M15 is implemented and awaiting CI
acceptance on `codex/m15-remaining-relics`. The repository currently contains
the strict TypeScript/Vite foundation, a rendering-independent authoritative
combat engine (deck/turn, HP/Block/damage, enemy intents, statuses, the duo
Lead/Support swap system, all 16 Reactions, delayed packets, keywords, and
bounded trigger/modifier dispatch), validated production content for the
Source, Shaper, Crew, and junk pools, all ten Section 3.10 relics, and a
minimal playable browser combat screen whose final state hash matches a
headless replay.

The authoritative list of what is accepted, what is in flight, and what is
next lives in [docs/STATUS.md](docs/STATUS.md). If you are continuing this work
from a chat rather than a local checkout, start with
[docs/PUBLISH_HANDOFF_M14_M15.md](docs/PUBLISH_HANDOFF_M14_M15.md): it records
the branches that have not been pushed yet.

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
npm run content:validate
npm run test:m15
npm run test:browser
npm run build
~~~

See [docs/STATUS.md](docs/STATUS.md) for the accepted milestone, verification
evidence, and next entry point. Commands for later milestones exit nonzero with
an explicit not-implemented message until their milestone is delivered.
