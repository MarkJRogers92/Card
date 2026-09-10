# M10 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `codex/m10-playable-combat`

Base: accepted M09 head `df06ba860287e5f3905f5d6056d44e5a68ffb441`

## Current state

M10 is accepted. The browser now opens into the first playable Morrow/Switch vs Claims Adjuster checkpoint, and the same fight can be driven headlessly through the M10 command API. M11 mechanics were not started.

## Preserved contracts

- React remains a control/projection layer; authoritative combat rules remain under `src/engine`.
- M07 card classification is still snapshotted before base effects.
- M07/M09 manual and card-driven swap atomicity remains unchanged.
- M08 Imprint/Reaction/delayed packet behavior is reused rather than reimplemented.
- M09 Morrow, Switch, and Shared Warranty triggers fire through the generic dispatcher.
- The M10 browser and headless paths both use the same `play_card`, `swap`, and `end_turn` command surface.
- The Claims Adjuster keeps its fixed revealed-intent cycle; Invoice generation remains deferred to M13.
- `Change of Shift` uses a narrow checkpoint post-play exhaust destination only. Do not treat this as completion of M11 keyword lifecycle.
- Browser command logs can be replayed headlessly and must reproduce the same authoritative hash.

## Verification

Substantive M10 implementation commit `f0f9296083dd3cfc7ad18c011fb9657c89571945` passed GitHub Actions run `34529248894`. The run passed install, type/generated-content checks, all general unit/content/replay/property suites, every focused M03–M10 suite, production build, Chromium setup, and two Playwright browser tests.

The primary Playwright test wins a Claims Adjuster fight through real rendered controls and proves its final authoritative hash equals replaying the browser-produced command log headlessly. Restart also restores the deterministic initial hash.

## Continuation rule

Begin M11 only from the final accepted head of `codex/m10-playable-combat`. Implement Exhaust, Retain, Fleeting, Unplayable, Protocol deployment, and additional HP costs while preserving browser/headless command parity. Do not begin M12 production Source card content until M11 is accepted. Do not modify `main` unless Mark separately asks for a merge.
