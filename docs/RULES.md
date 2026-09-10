# Rules

## Authority

[DESIGN.md](DESIGN.md) is the complete supplied specification and the
authoritative design snapshot. If implementation work appears to conflict with
it, stop and record the conflict instead of silently redesigning a mechanic.

## M00 boundary

M00 contains no combat rules, content definitions, runtime persistence, or
simulation. The engine exposes only a versioned bootstrap boundary. The browser
shell is a foundation status screen, not a playable game.

## Non-negotiable contracts for later milestones

- Combat rules stay in the rendering-independent engine.
- React, PixiJS, animation, audio, and input code consume state and presentation
  events; they do not decide outcomes.
- Content supplies structured combinations of approved operations.
- The engine must not branch on content IDs.
- Rules commands resolve atomically and future state is serializable.
- Randomness is seeded, versioned, and split into independent streams.
- Tests use authored expectations independent of the implementation under test.
- Saves are written only at atomic boundaries and preserve incompatible data
  rather than reinterpreting it.

## Verification discipline

Every task records its exact commands and results. A command is never reported as
passing unless it was actually run. Future command names may exist before their
implementation, but they must fail clearly until the corresponding milestone is
complete.
