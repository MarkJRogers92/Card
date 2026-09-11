# M18 — Rewards

## Scope

M18 introduces a pure reward engine. Callers inject a catalog and selected
roles; the engine neither reads files nor owns map, save, shop, profile, or
run routing.

## Contracts

- Ordinary rewards add 15 Scrap and offer cards.
- Elite rewards add 35 Scrap and contain a card choice plus two relic options.
- Act 1 boss rewards add 50 Scrap and contain three relic options.
- Card offers guarantee Source and Shaper when eligible, then use 40/40/20
  Source/Shaper/Crew weighting. Ordinary rarity weights are 65/30/5 and elite
  weights are 20/60/20, normalized over each role's available rarities.
- Locked cards/relics, unselected roles, owned relics, and duplicate IDs are
  excluded. Blank Badge flows through the existing generic option-count
  channel.
- Claim and skip commands are transaction-idempotent. An elite transaction can
  resolve its card and relic choice groups independently without losing either.

## Browser fixture

`createM10RewardFixture()` is a deterministic ordinary-reward presentation
fixture. The client renders pending authoritative rewards, uses engine claim/
skip commands, and displays authoritative Scrap.

## M19 boundary

M18 stores claimed definition IDs only. M19 will turn those choices into run
deck instances and connect post-combat routing; it must not change the reward
roll or transaction semantics established here.

## Local verification

`npm run check`, `test:engine` (282 tests), `test:content` (29 tests),
`content:validate`, `test:replay`, `test:properties`, `test:m18` (5 tests),
`build`, and `test:browser` (3 tests) pass. The local Playwright server uses
port 4183 to avoid an existing developer service on 4173.
