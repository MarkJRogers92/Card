# Content Guide

## Current status

M01 provides the authoritative JSON schemas, deterministic registry loader, and
structural/semantic validator. Production `content/` remains intentionally
absent until a later content milestone; the M01 fixtures under
`tests/fixtures/` are validation-only data.

This document records the authoring contract so content work has one stable
destination.

## M01 definition surface

The supported definition kinds are cards, relics, enemies, and events. Shared
value expressions, costs, predicates, triggers, and effect operations are
defined in `schemas/common.schema.json` and `schemas/effect.schema.json`.
Those schema files are the source of truth; `src/content/generated.ts` is
generated with `npm run content:types` and checked for drift by `npm run check`.

The closed M01 effect operation set is:

`damage`, `block`, `heal`, `apply_status`, `draw`, `gain_energy`, `swap`,
`boost_imprint`, `add_card`, `install_protocol`, `schedule_packet`,
`repeat_packet`, `gain_scrap`, `gain_evidence`, `change_standing`, `set_flag`,
`remove_card`, and `upgrade_card`.

## Authoring rules

- Use JSON data validated by JSON Schema Draft 2020-12 and Ajv.
- Reject unknown fields by default.
- Reference only approved operation names and structured predicates.
- Keep numeric values integer-based; represent multipliers as basis points.
- Keep definitions separate from runtime instances.
- Do not put executable JavaScript, eval, or runtime model calls in content.
- Use stable IDs, deterministic ordering, and explicit schema versions.
- Render text from validated effects and parameters where practical.
- Add targeted fixtures and a content report with every content batch.

## Validation workflow

Run `npm run content:validate -- path/to/definitions` for one or more JSON
files/directories. With no path, the command checks `content/` when that
directory exists. Diagnostics are sorted by source and JSON-pointer-style
instance path. `npm run content:report -- --json` emits a deterministic report
with definition counts, file status, and diagnostics.

## Expansion acceptance

A new card needs a purpose beyond being a larger or smaller existing card. A new
relic must interact with at least three existing cards, two different Reactions,
and one non-obvious build. Content batches may not add a custom engine
exception.

## M00 historical non-goals

M00 did not add cards, relics, enemies, events, characters, unlocks, schemas,
art, audio, or generated fixtures. M01 adds only schemas, validator code,
generated types, and test fixtures; it still does not add production content or
gameplay behavior.
