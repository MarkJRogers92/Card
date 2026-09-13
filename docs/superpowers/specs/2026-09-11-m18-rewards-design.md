# M18 Rewards Design

## Goal

Create a deterministic, authoritative reward subsystem that grants Scrap and
offers cards or relics after a completed encounter. A player can claim one
offered item or skip a card offer exactly once. M19 alone will decide when an
encounter completes and how a run advances.

## Scope

M18 owns reward data, seeded offer generation, eligibility filtering, claim
idempotency, and a compact browser choice view. It does not add map nodes,
run routing, persistence, shops, Grafts, unlock spending, or any new content.

## Authoritative state and commands

`src/engine/rewards.ts` will own a versioned `RewardState` held on the
authoritative state, separate from combat. It contains the current Scrap total,
one optional pending reward, an ordered transaction ledger, and the permanent
deck/relic inventory required to apply a claim. A reward has a deterministic
ID derived from its encounter ordinal and is either `card` or `relic`.

The public engine boundary exposes:

- `createEncounterReward(state, input)` to add the specified Scrap once and
  create a pending offer.
- `claimRewardOption(state, rewardId, optionId)` to atomically add the chosen
  card/relic and clear the pending reward.
- `skipCardReward(state, rewardId)` to clear a card offer without altering a
  hidden pity counter.

Repeated commands with the same completed transaction return the state
unchanged. A different command against a cleared or mismatched reward throws.
Only one pending reward is allowed.

## Generation

The engine draws only from explicit M18 inputs constructed from the validated
content registry. An eligible card must be draftable, unlocked, and in the
current selected-role pool. A relic must be available, unlocked, and not
already owned. The first two card slots are Source and Shaper; later slots use
Source 40%, Shaper 40%, Crew 20%. If a role has no eligible card for a chosen
rarity, its available rarity weights are normalized. A retry-free weighted
selection removes each selected definition immediately, so an offer never has
duplicates.

Ordinary card rarity is Common/Uncommon/Rare at 65/30/5. Elite is 20/60/20.
Card count uses the existing `cardRewardOptionCount()` modifier channel so
Blank Badge provides its fourth option. Relic offers are uniform eligible
choices with the encounter-defined count. M18 owns no unlock progression;
callers provide unlocked IDs.

## Browser choice UI

The existing debug client gets a small reward panel shown only when a pending
reward exists. It lists the named options, Scrap, and either a claim button for
each option or Skip for card rewards. It calls the authoritative commands and
renders any command error. The M10 combat screen remains the default fixture;
M19 will supply the real reward-to-combat flow.

## Tests and acceptance

`tests/unit/rewards.test.ts` covers fixed-seed determinism; Source/Shaper
guarantees; role/rarity normalization; no duplicates; Blank Badge count;
eligible pool filtering; Scrap amount; exactly-once claims; and card skips.
The existing type, content, property, replay, and browser suites remain green.
The M17 workflow will be extended to include `test:m18` after implementation.

## M19 handoff

M19 consumes only the public reward commands: after its combat node resolves,
it invokes `createEncounterReward`; the player resolves the pending choice;
then M19 advances the fixed node graph. This keeps reward correctness
independent of map routing and makes claim replay idempotency testable before
the run system exists.
