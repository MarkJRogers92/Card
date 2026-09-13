# M22 Map Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace M19's fixed route with a deterministic branching two-act map whose Act 1 is playable and whose Act 2 is visible but reserved and locked.

**Architecture:** A pure `map.ts` builds the fixed topology using only the map RNG stream. `RunState` persists the graph plus navigation; engine commands own legal selection, while React renders it. The M20 save layer migrates old snapshots before validation and M21 persists the result unchanged.

**Tech Stack:** TypeScript, Vitest, fast-check, React, Playwright, IndexedDB through existing M21 adapter.

**Spec:** Approved chat design of 2026-09-12; `docs/DESIGN.md` 6.1-6.3, 8.11, and M22 milestone row.

## Global Constraints

- Work only on `codex/m22-map-template`, created from `34b31a4`; do not merge to `main`.
- Keep Act 2 reserved: no combat, rewards, shop, event, treasure, or ending behavior.
- Generate the documented seven-row, fourteen-node fixed template for each act; use only the existing map RNG stream.
- Migrate the authoritative `RunState` through `src/engine/save.ts`; do not bypass M21 persistence.
- Add no dependencies or production content.
- Prove over 1,000 seeds: deterministic maps, legal placements/links, a reachable boss, and no consecutive duplicate ordinary encounter.

---

### Task 1: Pure deterministic map graph

**Files:** Create `src/engine/map.ts`; create `tests/unit/m22-map.test.ts`.

**Interfaces:** Export `MAP_VERSION`, `MapNodeKind`, `RunMapNode`, `RunMapAct`, `RunMap`, `createRunMap(seed)`, `validateRunMap(map)`, and `reachableNodeIds(map, completedNodeIds)`. Consume only existing RNG and Act 1 encounter definitions.

- [ ] **Step 1: Write failing tests.** Assert two acts, seven rows each, fourteen nodes per act, exact fixed link template, deterministic equality for a seed, and this 1,000-seed proof:

```ts
for (let seed = 0; seed < 1_000; seed += 1) {
  const map = createRunMap(seed);
  expect(validateRunMap(map)).toEqual({ ok: true });
  expect(hasReachableBoss(map, 1)).toBe(true);
  expect(hasReachableBoss(map, 2)).toBe(true);
  expect(hasNoConsecutiveDuplicateOrdinaryEncounter(map)).toBe(true);
}
```

- [ ] **Step 2: Verify RED.** Run `npx vitest run tests/unit/m22-map.test.ts`; it must fail because the map module is absent.
- [ ] **Step 3: Implement minimal graph generation.** Use canonical IDs `act-<act>-row-<row>-col-<column>`. Materialize all node positions/links; put seeded encounter assignment only on Act 1 ordinary slots, choosing a different encounter from the immediate legal predecessor when needed. Act 2 node payloads are typed as reserved without selecting content.
- [ ] **Step 4: Verify GREEN.** Run `npx vitest run tests/unit/m22-map.test.ts` and require all seeds to pass.
- [ ] **Step 5: Commit.** Stage these two files and commit `feat: add deterministic M22 map graph`.

### Task 2: Map-bearing run state, legal navigation, and migration

**Files:** Modify `src/engine/run.ts`, `src/engine/state.ts`, `src/engine/save.ts`, and `src/engine/index.ts`; create `tests/unit/m22-run.test.ts`; modify `tests/unit/save.test.ts` and `tests/replay/save-roundtrip.test.ts`.

**Interfaces:** Consume Task 1 exports. Produce map-bearing `RunState`, `createM22Run(seed)`, `currentReachableNodeIds(state)`, `selectRunMapNode(state, nodeId)`, and map-aware `currentRunNode(state)`.

- [ ] **Step 1: Write failing tests.** Test first-row selection; reject an unreachable sibling, completed node, and any Act 2 node; complete a legal node and expose only its forward links. Import an M21 snapshot and assert its migrated `run.map.acts` has length two.
- [ ] **Step 2: Verify RED.** Run `npx vitest run tests/unit/m22-run.test.ts tests/unit/save.test.ts tests/replay/save-roundtrip.test.ts`; failures must name missing map navigation/schema migration.
- [ ] **Step 3: Implement minimal authoritative transition.** Bump run/state/save versions; append a save 2-to-3 migration that regenerates from `run.seed` and maps the M19 fixed current/completed sequence to equivalent Act 1 nodes. Strict validation checks the persisted map and navigation IDs. Preserve existing M19 combat, reward, rest, deck, relic, and character rules after selection.
- [ ] **Step 4: Verify GREEN.** Run `npx vitest run tests/unit/m22-map.test.ts tests/unit/m22-run.test.ts tests/unit/save.test.ts tests/replay/save-roundtrip.test.ts`.
- [ ] **Step 5: Commit.** Stage the listed engine/tests and commit `feat: persist M22 map navigation`.

### Task 3: Map fixture UI and browser proof

**Files:** Modify `src/client/App.tsx` and its existing stylesheet; create `tests/browser/m22-map.spec.ts`; modify `package.json`, `docs/STATUS.md`; create `docs/milestones/M22_MAP_TEMPLATE.md`.

**Interfaces:** Consume Task 2 exports. Produce `?fixture=m22`, buttons with `map-node-<id>` test IDs, `map-act-1`, `map-act-2`, and `npm run test:m22`.

- [ ] **Step 1: Write failing browser test.** Open `/?fixture=m22`; assert Act 1 appears, Act 2 says Reserved, an Act 2 node is disabled, click the first Act 1 node, and assert `run-begin-node` becomes enabled.
- [ ] **Step 2: Verify RED.** Run `npx playwright test tests/browser/m22-map.spec.ts`; it must fail because fixture and controls are absent.
- [ ] **Step 3: Implement narrow presentation.** Render nodes in persisted row/column order with visible completed/current/reachable/unavailable/reserved state and accessible labels. Dispatch only legal Act 1 selection. Do not change M19/M20/M21 fixtures or add content behavior.
- [ ] **Step 4: Verify GREEN.** Run `npm run test:m22 && npx playwright test tests/browser/m22-map.spec.ts`.
- [ ] **Step 5: Commit.** Stage the listed UI/tests/docs and commit `feat: add M22 map fixture`.

### Task 4: Focused final gate and handoff

**Files:** Create `docs/PUBLISH_HANDOFF_M22.md`.

- [ ] **Step 1: Run the gate.** Run `npm run test:m19 && npm run test:m20 && npm run test:m21 && npm run test:m22 && npx playwright test tests/browser/m22-map.spec.ts`. Fix real failures; never weaken tests.
- [ ] **Step 2: Record evidence.** Include exact head, branch, map invariants, migration behavior, explicit Act 2 exclusions, command outcomes, and publication instructions that keep M22 separate from main.
- [ ] **Step 3: Commit.** Stage the handoff and commit `docs: record M22 map template handoff`.

## Plan self-review

- Task 1 covers deterministic topology, legal placement/links, boss reachability, and duplicate-encounter invariant.
- Task 2 covers authoritative navigation and M21-compatible save migration.
- Task 3 covers the accessible map UI and locked Act 2 browser proof.
- Task 4 supplies proportionate regression evidence and recovery-ready publication handoff.
