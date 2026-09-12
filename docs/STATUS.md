# Status

## Current milestone

**M21 — browser persistence — local implementation checkpoint**

M21 adds the browser persistence adapter in `src/platform/`: one IndexedDB
database (`joint-liability`), one active save generation, two rotating backups,
an atomic commit that rotates only generations which already loaded, a loader
that selects the newest loadable generation by slot order, and a quarantine
history that preserves every rejected payload instead of deleting it. The run
save text and the reserved profile payload are written as a single generation
record, so run and profile cannot diverge. Fault-injection tests abort a genuine
IndexedDB transaction and simulate a torn write at every transaction boundary;
after each interruption the store reloads a valid generation and a claimed
reward is never applied twice. The `?fixture=m21` route commits, reloads, and
repairs a corrupted active record in real Chromium. See
`docs/milestones/M21_BROWSER_PERSISTENCE.md`. M22 owns the branching map, M23
owns purchases, and M29 owns the profile payload's semantics.

This checkpoint is pushed to `MarkJRogers92/Card` on `codex/m21-persistence`
with passing GitHub Actions run
[`34663330230`](https://github.com/MarkJRogers92/Card/actions/runs/34663330230)
(`M21 Acceptance`) at `f5926d3`; see `docs/PUBLISH_HANDOFF_M21.md`.

## Previous checkpoint

**Act 1 first pass — card rewards corrected on this branch**

Claiming a card reward used to record only an id: no deck instance was created,
and the act refused any definition outside the M10 starter set, so a pick had no
effect and could not have been played. `claimRunReward` now appends a real deck
instance that later nodes carry, `src/content/bundle.ts` gives the browser and
tests the checked-in content definitions, and a deck containing content cards
settles Retain, Fleeting, Exhaust, and unplayable junk through the M11
lifecycle. Starter-only decks keep the original end-turn path. Claimed relics
are still inert and need a `RunState.relicIds` field plus a save migration; see
the "Card rewards and content cards" section of
`docs/milestones/M19_FIXED_TEST_ACT.md`.

**M17 locked enemy targeting — corrected on this branch**

`enemy.repo_foreman` `named_claim` and `enemy.head_of_recovery`
`named_in_claim` previously carried the unresolved placeholder
`{ kind: "locked", actorId: "source" }`, so selecting either move threw and the
elite and Act 1 boss fights could not be played at all. M17 now defines the
rule: a Locked enemy move authored with `LOCKED_AT_REVEAL_ACTOR_ID` names the
character occupying Front when the intent is revealed, and the selected intent
stores that character, so a later swap moves the named character but never
redirects the attack. Both encounters now resolve through the real
`applyM19Command` surface. The same correction is on
`codex/m16-family-transformations` and `codex/m20-serialization`; see the
"Locked enemy targeting" section of `docs/milestones/M17_INITIAL_ENEMIES.md`.

**M20 — snapshot serialization — local implementation checkpoint**

M20 adds the pure save-encoding layer in `src/engine/save.ts`: a versioned save
envelope (`saveVersion`, `engineVersion`, `contentVersion`, `contentHash`,
`snapshot`, `checksum`), canonical JSON export/import, a migration contract,
structural and embedded-version validation, and explicit content-identity
rejection that preserves the original save text. Save → load preserves the
authoritative hash, including RNG cursors, trigger counters, delayed packets,
pending rewards, deck instances, and run progress. The `?fixture=m20` browser
route exports, reimports, and rejects a tampered save. See
`docs/milestones/M20_SNAPSHOT_SERIALIZATION.md`. M21 owns IndexedDB
persistence, the active save, and rotating backups. That milestone document
also records an M17 elite/boss intent-selection defect the M20 trace surfaced:
the authored `named_claim`/`named_in_claim` moves target the placeholder
`{ kind: "locked", actorId: "source" }`, which throws during intent selection.
This checkpoint is pushed to `MarkJRogers92/Card` on
`codex/m20-serialization` with passing GitHub Actions run
[`34662179579`](https://github.com/MarkJRogers92/Card/actions/runs/34662179579)
(`M20 Acceptance`) at `b12cf5a`; see `docs/PUBLISH_HANDOFF_M20.md`.

## Previous checkpoint

**M19 — fixed test act — implementation checkpoint**

M19 adds the second playable checkpoint: a deterministic seven-node Act 1
route (`ordinary_1`, `rest_1`, `ordinary_2`, `elite`, `rest_2`, `ordinary_3`,
`boss`) driven by a versioned `RunState` in authoritative state. Party HP,
deck instances, Scrap, and claimed reward IDs persist between combats while
turn, zone, status, intent, and combat-RNG state are rebuilt for each
encounter. Victory creates the M18 reward, rest heals one character for 18
capped at maximum HP, and advance is rejected until the node is complete and
its reward resolved. See `docs/milestones/M19_FIXED_TEST_ACT.md`. M20 owns
serialization and M22 owns map generation.

## Previous checkpoint

**M18 — rewards — implementation checkpoint**

M18 adds deterministic, gameplay-RNG reward transactions: 15/35/50 Scrap for
ordinary/elite/Act 1 boss encounters, role-aware card options, relic options,
and idempotent claim or card-skip commands. The browser M10 fixture exposes an
ordinary reward panel with authoritative Scrap and no client-side rolls. M19
will connect the claimed definitions to a run deck and map progression; it
does not change M18's reward-generation contracts.

## Previous accepted milestone

**M17 — initial enemies and encounters — accepted**

M17 is implemented locally on top of the unaccepted M16 checkpoint on
`codex/m16-family-transformations`. It adds the initial enemy/encounter data,
enemy-issued Invoices, the Intern's living-ally death effect, and Head of
Recovery's immutable future-intent threshold behavior. Focused M05, M11, and
M17 suites plus the content/type check pass. See
`docs/milestones/M17_INITIAL_ENEMIES.md`. The subsequent lifecycle correction
also restores the terminal-victory HP-cost regression: `npm run test:engine`
now passes all 277 unit tests, alongside content, property, replay, and M17
focused validation.

## Predecessor checkpoint

**M16 — family transformations — local implementation checkpoint**

M16 is implemented locally on `codex/m16-family-transformations` from accepted
M15 base `d09e963`. It has not been published or accepted yet. Focused M14,
M15, and M16 suites and the content/type check pass locally.

## Previous accepted milestone

**M15 — remaining relics — accepted**

M15 is accepted on `codex/m15-remaining-relics`. GitHub Actions run
[`34557264949`](https://github.com/MarkJRogers92/Card/actions/runs/34557264949)
passed the exact head `295af4a5ddd719afacccb58343bced9a4bac0b16`.
The acceptance job passed locked dependency installation, generated-content/
type checks, general engine/content/validation/replay/property suites, every
focused M03–M15 command, production build, Chromium installation, and the
unchanged M10 browser/replay regression.

M15 completes Refund Capacitor, Arc Welder, Counterfeit Seal, Carbon Copy, and
Blank Badge as validated production content plus the generic limited resource,
cost, delayed-repeat, Imprint reinforcement, and reward-option surfaces those
definitions require. See `docs/milestones/M15_REMAINING_RELICS.md` and
`docs/M15_NORMAL_CHAT_HANDOFF.md` for the exact contracts.

## M15 acceptance checklist

- [x] Refund Capacitor grants 1 Energy only after the first Potency-3 primary Reaction each player turn
- [x] Arc Welder adds 1 Potency when reinforcing an existing Volt Imprint, still capped at 3
- [x] Counterfeit Seal discounts the first Grafted card played each player turn by 1 Energy, minimum 0
- [x] Carbon Copy schedules one extra 50% next-turn repeat of the first primary Loop Reaction each player turn, with per-output flooring and zero suppression
- [x] Blank Badge raises the generic card-reward option count from 3 to 4
- [x] No relic-ID branches were added; effects compile from schema fields
- [x] Counterfeit Seal uses the normal trigger limit/counter machinery rather than a second turn-counter system
- [x] Carbon Copy uses serializable scheduled packets and cannot recursively copy its own extra repeat
- [x] M15 remains correctly bounded: M18 consumes Blank Badge and M24/M25 author the `grafted` tag
- [x] Prior M00–M14 suites continue to pass
- [x] Production build passes
- [x] M10 Playwright browser/replay regression remains green

## Previous accepted milestone

**M14 — first relics — accepted**

M14's original acceptance evidence remains GitHub Actions run
[`34548620092`](https://github.com/MarkJRogers92/Card/actions/runs/34548620092)
at implementation commit `2221c093c6cca649b62a8d811188e0fba3a2ce2b`.
It completed Shared Warranty, Wetware Die, Clot Filter, Organ Bag, and Parallel
Port plus the generic relic-content compiler.

The later duplicate-relic hardening is included in the accepted M15 history and
therefore is also covered by M15 run `34557264949`; duplicate relic sources are
rejected rather than silently stacked.

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted on `codex/m02-engine-foundation`; GitHub Actions run `34478451729`.
- **M03 — deck, Energy, and turn foundation**: accepted on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623`.
- **M04 — HP, Block, damage, and targeting**: accepted on `codex/m04-hp-damage-targeting`; final GitHub Actions run `34496069587`.
- **M05 — enemy move cycles and fixed intents**: accepted on `codex/m05-enemy-intents`; final GitHub Actions run `34498521927`.
- **M06 — status timing and escalation**: accepted on `codex/m06-status-timing`; final GitHub Actions run `34501385073`.
- **M07 — duo handoffs, Imprints, and Needle Reactions**: accepted on `codex/m07-imprint-needle-reactions`; final GitHub Actions run `34506507341`.
- **M08 — remaining Reactions and serializable delayed packets**: accepted on `codex/m08-reactions-delayed-packets`; final GitHub Actions run `34524502196`.
- **M09 — bounded trigger/modifier dispatch and initial passives**: accepted on `codex/m09-trigger-passives`; final GitHub Actions run `34526337720`.
- **M10 — minimal playable browser combat**: accepted on `codex/m10-playable-combat`; final head `105369de44b1cafa11ec5cdaf093becc01e24198` passed GitHub Actions run `34529482114`.
- **M11 — card keyword lifecycle, Protocols, and additional HP costs**: accepted on `codex/m11-keyword-lifecycle`; final head `b40c0cc00e1cfabb1846241a9589c2eabb824c64` passed GitHub Actions run `34537126146`.
- **M12 — Source card pool**: accepted on `claude/m12-source-card-pool`; final head `4cd56b45e5e91a7514207f9e487a999c40a483a8` passed GitHub Actions run `34540152598`.
- **M13 — Shaper, Crew, and junk card pool**: accepted on `claude/m13-shaper-crew-junk-pool`; substantive head `c0fc846c1695886497ef6af6ea7d966ae2dd0907` passed GitHub Actions run `34542002526`.

## M15 verification record

The accepted M15 implementation extends the schema/content-driven relic model
rather than introducing relic-specific branches. `card_play_cost` provides a
generic pre-payment trigger surface; primary-Reaction events carry the Potency,
Material/Form, and delayed packet data needed by remaining relics; Volt
reinforcement and reward-option count use dedicated generic modifier channels;
and optional validated card tags provide the future Grafted-card hook.

GitHub Actions run `34557264949` passed at exact head
`295af4a5ddd719afacccb58343bced9a4bac0b16`, including all general suites,
focused M03–M15 tests, production build, Chromium installation, and the M10
browser/replay regression.

The M10 checkpoint remains intentionally stable as a regression fixture and
was not touched.

`main` remains unchanged by M02–M15 milestone work.

## Next eligible milestone

**M17 — initial enemies and encounters** is eligible after M16 acceptance.
