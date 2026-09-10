# M01 Task Evidence

## ID

JL-M01-IMPLEMENT

## Goal

Establish schema-first validation for cards, relics, enemies, events, shared
integer expressions/costs/predicates, and the closed M01 effect operation set.

## Dependencies

M00 at the accepted local main baseline.

## Relevant design sections

`docs/DESIGN.md` §§8.3–8.9, 8.14, 9.1, 9.5, 10.5, and M01 in §10.6.

## Deliverables

- Draft 2020-12 schemas in `schemas/` for common primitives/expressions,
  effects, cards, relics, enemies, and events.
- Ajv 2020 structural validation plus deterministic registry semantics for
  IDs, references, expressions, costs, allowlists, and nested effects.
- Generated, namespaced TypeScript declarations with drift detection.
- `content:validate`, `content:report`, and focused `test:content` commands.
- Authored valid fixtures for every definition kind and every effect operation,
  plus invalid fixtures with exact-path diagnostics.

## Explicit non-goals

No reaction, encounter, character, contract, unlock, difficulty, save,
gameplay, UI behavior, production content, art, audio, browser automation, or
deployment work is included.

## Verification

The final M01 verification record, command output, commit SHA, limitations, and
next milestone are maintained in `docs/STATUS.md` and the handoff report.
