# M19 Fixed Test Act Design

## Goal

Deliver the second playable checkpoint: one deterministic seven-node Act 1
that a headless script and the browser can complete. It proves that party HP,
the deck, claimed reward definitions, relics, and Scrap persist across fights,
while combat-only state is recreated for each encounter.

## Fixed route

The M19 test act is intentionally linear:

1. ordinary combat;
2. rest (heal one selected character for 18 HP);
3. ordinary combat;
4. elite combat;
5. rest (heal one selected character for 18 HP);
6. ordinary combat;
7. Head of Recovery boss.

This is a test route only. M22 owns the branching map, its generator, shops,
events, treasure, and workshop nodes. M20 owns serialization and M21 owns
persistent browser storage.

## Engine boundary

`src/engine/run.ts` owns a versioned `RunState` embedded in authoritative
state. It records the current node, completed node IDs, persistent character
HP, deck/reward inventory, and terminal outcome. It exposes atomic commands
to create a run, begin a node, resolve a winning combat into its M18 reward,
claim or skip a pending reward, heal at rest, and advance only when the
current node is complete.

Combat setup is supplied by a pure M19 encounter factory. It starts a fresh
combat state from persistent run data and the appropriate M17 formation; on
victory it copies only persistent values back into `RunState`. A defeat ends
the run and never creates a reward. No command reads files or lets React
choose an encounter or reward.

## Persistence rules

- Both characters keep their current HP between nodes; rest heals one target
  by 18, capped at that character's maximum HP.
- The starting deck persists. M18 claimed card-definition IDs are retained in
  the run inventory; M19 does not invent deck-instance semantics beyond the
  existing card-instance model.
- Scrap and claimed relic IDs persist through the whole act.
- A new combat gets fresh turn, actor, deck-zone, status, intent, and
  combat-RNG state derived from the authoritative gameplay streams.
- Replaying an already-completed command is a no-op where M18's transaction
  contract requires it; a mismatched node or illegal phase throws.

## Presentation and verification

The browser gains a compact test-act status strip and controls for the active
node. It uses only M19 engine commands. A headless test completes the route
with deterministic commands and asserts no combat state leaks between fights;
a browser script completes the same route, resolves its reward, uses rest,
and reaches the boss.

## Non-goals

No save/load, profile, evidence, unlocks, branching map, shop, event,
treasure, workshop, Graft, new content, or visual-map redesign is included.
