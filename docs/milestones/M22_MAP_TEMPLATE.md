# M22 — Branching Two-Act Map Template

**Status:** Task 3 local implementation checkpoint on `codex/m22-map-template`,
started from the Task 2 commit `2708f92` (`feat: persist M22 map navigation`).
Task 1 (`96e2dc5`) added the pure graph in `src/engine/map.ts`; Task 2
(`2708f92`) added the map-bearing run state, legal navigation, and the M21 save
migration. Task 3 adds the fixture UI and its browser proof.

**Branch:** `codex/m22-map-template` (not merged, not pushed)

## Scope

Task 3 delivers the map presentation and browser proof:

- `?fixture=m22` starts a `createM22Run()` run and renders both persisted acts.
- Nodes render in persisted row/column order; each button carries
  `data-testid="map-node-<id>"` and `data-state`.
- The Act 2 container is `map-act-2`, is visible, and says **Reserved**; every
  Act 2 node is disabled.
- Every node has an accessible label naming its kind, id, and state.
- `npm run test:m22` runs the focused M22 engine scope.

It adds no dependencies, changes no engine file, and adds no Act 2, event,
shop, workshop, treasure, reward, or combat behavior.

## Node states

`src/client/App.tsx` derives each node's presentation state from persisted run
state, never from a content id:

| State | Meaning |
|---|---|
| `completed` | The node is in `run.completedMapNodeIds`. |
| `current` | The node is `run.mapNodeId`. |
| `reachable` | `currentReachableNodeIds` offers the node next. |
| `unavailable` | Act 1 node that is not reachable, or a kind M22 has no handler for. |
| `reserved` | Any Act 2 node; the act is visible but locked. |

A node button is enabled only when it is an Act 1 node, its kind is playable
under `isPlayableMapNodeKind`, it is not complete, and it is currently
reachable. That keeps unsupported service nodes unavailable instead of relying
on the engine to reject a click, and it dispatches only legal Act 1 selections
through `selectRunMapNode`.

The chosen node must equal `run.mapNodeId` before **Begin node** unlocks, so
the row-1 entrance is picked rather than auto-started. M19, M20, and M21
fixtures keep their previous behavior: the map panel only renders when
`run.map !== null`, and the M19 `run-advance` control is unchanged for
fixed-route runs.

## Evidence

- `npm run test:m22` — passed: 4 files, 53 tests (`m22-map`, `m22-run`,
  `save`, `save-roundtrip`).
- `node_modules/.bin/tsc --noEmit` — `src/client/App.tsx` is clean. The only
  remaining errors are pre-existing in files this task does not own
  (`tests/unit/m22-map.test.ts` imports a `RunMapNodeKind` name `map.ts` does
  not export, and `fake-indexeddb` types are missing from this install).
- `vite build` — passed; the m22 UI bundles.
- `tests/browser/m22-map.spec.ts` — authored. The worker sandbox denied
  `listen` and browser launch (`EPERM`), so the Playwright run could not start
  here; the spec mirrors the static assertions below and must be executed on a
  host with Playwright browsers available.
- RED (before the UI): rendering `?fixture=m22` fell through to the M10
  checkpoint and produced no `map-act-1`, no map nodes, and no
  `run-begin-node`.
- GREEN (after the UI): a server-render check confirmed `map-act-1` and
  `map-act-2`, 14 nodes per act, **Reserved** on Act 2, disabled Act 2 and
  service nodes (`data-state="unavailable"`), a current, enabled entrance, and
  a disabled `run-begin-node`; existing `m18`/`m19`/`m20`/`m21` fixtures still
  render without a map.

## Out of scope

Act 2 combat, rewards, events, shops, workshops, treasure, purchases, the
final acceptance gate, and the publication handoff belong to later milestones
(M23 and Task 4). This branch is not committed, pushed, merged, or published.
