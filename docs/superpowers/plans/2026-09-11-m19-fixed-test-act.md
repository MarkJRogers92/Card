# M19 Fixed Test Act Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic seven-node Act 1 route that preserves run data across combats.

**Architecture:** A pure `run.ts` owns node progression and persistent state. A narrowly extracted combat factory starts M17 formations from persistent party/deck data; React only sends run commands and renders the result. M19 consumes M18 rewards but adds no map generation, saves, shops, or new content.

**Tech Stack:** TypeScript, Vitest, React, Vite, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-11-m19-fixed-test-act-design.md`

## Global Constraints

- Keep randomness in existing gameplay RNG streams and preserve deterministic hashes.
- Preserve party HP, Scrap, claimed reward IDs, relic IDs, and deck instances between fights.
- Rebuild only combat-only state for each encounter.
- Do not add save/load, profile, branching map, shop, event, treasure, Workshop, Graft, or content.

---

### Task 1: Reusable Act 1 combat setup

**Files:** Modify `src/engine/m10-fight.ts`, `src/engine/initial-enemies.ts`, `src/engine/index.ts`; test `tests/unit/m19-run.test.ts`.

**Interfaces:** Produce `createAct1Combat(state, setup)` where `setup` supplies a formation and persistent player HP/deck. Export `ACT_1_ELITE_ENCOUNTERS` and `ACT_1_BOSS_ENCOUNTER` without card/relic-ID conditionals.

- [ ] Write a failing test that starts Claims Adjuster and Repo Foreman setup from supplied HP and asserts that both retain the supplied HP while their combat turn/zone state is fresh.
- [ ] Run `npx vitest run tests/unit/m19-run.test.ts`; expect failure because `createAct1Combat` is absent.
- [ ] Extract the shared M10 setup steps into the factory, preserving the M10 public fixture unchanged.
- [ ] Re-run the focused test and `npm run test:m10`.
- [ ] Commit with `refactor: extract M19 Act 1 combat setup`.

### Task 2: Versioned fixed-route state

**Files:** Create `src/engine/run.ts`; modify `src/engine/state.ts` and `src/engine/index.ts`; test `tests/unit/m19-run.test.ts`.

**Interfaces:** Produce `RunState`, `M19_NODE_IDS`, `createM19Run(seed)`, and `currentRunNode(state)`. The ordered nodes are `ordinary_1`, `rest_1`, `ordinary_2`, `elite`, `rest_2`, `ordinary_3`, and `boss`.

- [ ] Write failing tests asserting the exact seven-node order, initial `ordinary_1` node, empty completed IDs, and no active combat before `beginRunNode`.
- [ ] Run the focused test; expect the run contracts to be absent.
- [ ] Add a versioned run state to authoritative state and initialize it only through `createM19Run`.
- [ ] Re-run focused tests and `npm run check`.
- [ ] Commit with `feat: add M19 fixed run state`.

### Task 3: Atomic node progression

**Files:** Modify `src/engine/run.ts`; test `tests/unit/m19-run.test.ts` and `tests/replay/m19-act.test.ts`.

**Interfaces:** Produce `beginRunNode(state)`, `completeRunCombat(state, catalog)`, `restRunCharacter(state, actorId)`, and `advanceRunNode(state)`. Combat completion requires victory; ordinary/elite/boss invoke M18 reward generation, rest heals one player by 18 capped at maximum HP, and advance rejects unresolved combat or reward state.

- [ ] Write failing tests for combat victory creating the correct 15/35/50 Scrap reward, rest HP capping, blocked advance with a pending reward, and an authored deterministic completion trace.
- [ ] Run focused unit/replay tests; expect missing commands.
- [ ] Implement command validation, copying persistent HP and deck/reward inventory at combat boundaries, and fresh combat creation at the next combat node.
- [ ] Re-run focused tests, `npm run test:engine`, `npm run test:replay`, and `npm run test:properties`.
- [ ] Commit with `feat: implement M19 run transitions`.

### Task 4: Minimal test-act browser route

**Files:** Modify `src/client/App.tsx`, `src/client/App.css`, `tests/browser/m10-combat.spec.ts`.

**Interfaces:** Add test IDs `run-node`, `run-begin-node`, `run-rest-morrow`, and `run-advance`. Keep the original M10 combat route untouched; expose M19 only through `?fixture=m19`.

- [ ] Write a failing browser test that opens `/?fixture=m19`, starts the first node, resolves its reward, uses rest, and observes the next node.
- [ ] Run the focused Playwright test; expect missing M19 controls.
- [ ] Render run controls from authoritative run state and call only M19 engine commands.
- [ ] Re-run the focused browser test and the unchanged M10 browser/replay test.
- [ ] Commit with `feat: add M19 test act browser route`.

### Task 5: Acceptance record and CI

**Files:** Modify `package.json`, `.github/workflows/m17-ci.yml`, `docs/STATUS.md`; create `docs/milestones/M19_FIXED_TEST_ACT.md`.

- [ ] Add `test:m19` for M19 unit and replay tests and invoke it in the acceptance workflow after M18.
- [ ] Record the fixed route, persistence boundary, exact local verification, and M20/M22 boundaries.
- [ ] Run `npm run check`, `npm run test:engine`, `npm run test:content`, `npm run content:validate`, `npm run test:replay`, `npm run test:properties`, `npm run test:m19`, `npm run build`, and `npm run test:browser`.
- [ ] Commit with `ci: record M19 fixed test act acceptance` and push `codex/m16-family-transformations`.

## Plan self-review

Task 1 supplies the reusable combat boundary; Tasks 2–3 establish all state and transition contracts; Task 4 proves the engine through a narrow browser route; Task 5 records and automates acceptance. The plan contains every M19 requirement and excludes M20 saves and M22 map generation.
