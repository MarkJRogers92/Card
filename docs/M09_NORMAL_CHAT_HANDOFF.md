# M09 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `codex/m09-trigger-passives`

Base: accepted M08 head `cbd5eed93a57b21bca3fbac7b2dea70bbb4b2977`

## Current state

M09 is accepted. It adds deterministic bounded trigger/modifier dispatch, authoritative turn/combat trigger counters, preview-safe eligibility, and the initial Morrow, Switch, and Shared Warranty behaviors. M10 browser UI work was not started.

## Preserved contracts

- M07 Lead/Support/Crew classification remains snapshotted before base effects.
- Manual/card-driven swap Energy and allowance accounting remains atomic.
- M08 post-card Imprint/Reaction resolution remains unchanged; M09 card triggers run afterward through `resolvePostCardIngredientWithTriggers`.
- M08 scheduled packets remain serialized and resolve before the normal player-turn draw.
- Shared Warranty observes all swaps, including card-driven free swaps, without changing the separate manual-swap allowance.
- Trigger order is priority → stable source ID → stable trigger ID.
- Turn counters reset at player-turn start; preview never consumes counters or RNG.
- Trigger dispatch fails diagnostically at its 256 generated activation/effect ceiling rather than silently dropping effects.
- Modifier collection is deterministic; arithmetic remains owned by the affected channel.
- No gameplay rule depends on React/Pixi or a hard-coded card/relic ID branch.

## Verification

The corrected substantive M09 implementation at `05269a1bc118792ca727b427b7b2d1b99d4f961c` passed GitHub Actions run `34526001392`, including `npm ci`, type/generated-content checks, all general unit/content/replay/property suites, every focused M03–M09 suite, and production build.

The first two M09 workflow attempts failed because an edit to `package.json` accidentally omitted the already-existing `@vitejs/plugin-react` devDependency. It was restored exactly; no rules or tests were changed to obtain the green run.

## Continuation rule

Begin M10 only from the final accepted head of `codex/m09-trigger-passives`. Build the minimal browser combat screen with the starter deck, target selection, swaps, End Turn, and restart. The UI must call real engine operations and must not own rules timing. Acceptance requires a scripted browser fight against a Claims Adjuster whose final authoritative-state hash matches the equivalent headless replay. Do not modify `main` unless Mark separately asks for a merge.
