# M05 — Enemy Move Cycles and Fixed Intents

Status: **in progress**

## Scope

M05 adds deterministic enemy controller state, authored cycle/opening-cycle selection, revealed intent snapshots, intent projection, and displayed-order enemy-phase execution. It preserves M04 targeting semantics: Front and Reserve remain dynamic until hit time, while Locked remains attached to the named character captured by the revealed intent.

M05 does not implement status effects, Strength/Weak forecasting, global escalation, boss phase transition rules, card-effect compilation, Imprints, Reactions, or player manual-swap costs.

## Runtime contract

- Enemy behavior definitions remain external to authoritative runtime state and are addressed by definition ID; the content hash remains the version boundary.
- A selected intent snapshots the move ID, label, target rule, and M05-executable effects when it is revealed.
- Replacing or changing a behavior definition after reveal cannot rewrite the current selected intent. A changed definition may affect only a later selection.
- Controller setup order is authoritative displayed/execution order.
- Dead enemies do not execute and do not receive a new intent.
- Initial intents are selected during combat setup before the first player turn.
- After an enemy phase resolves, the next intents are selected before the next player turn may begin.

## Executable effect subset

M05 executes the primitives already owned by prior milestones and needed to prove the controller: direct damage (including multiple hits) and self Block gain. The Claims Adjuster fixture therefore proves `Stamp` (Front 7), the Block portion of `Paperwork` (gain 6 Block), and `Stamp Harder` (Front 10) in exact repeating order.

The authored Paperwork side effect that adds an Invoice to discard is intentionally deferred. The roadmap does not add Invoice production content until M13, and M05 does not introduce a content-ID special case or premature generic card-effect compiler merely to fake that later feature.

## Acceptance target

M05 is accepted only when the locked GitHub Actions run passes every prior suite plus `npm run test:m05` and the production build. Focused tests must prove:

- Claims Adjuster selects/executes `stamp → paperwork → stamp_harder → stamp`;
- intents are visible before the first player action;
- Front targeting follows formation at execution while Locked does not;
- changing the behavior/phase definition after reveal cannot rewrite the current move/effects;
- living enemies execute in explicit displayed order;
- opening-cycle behavior works;
- the next player turn cannot begin until the enemy phase has actually resolved.
