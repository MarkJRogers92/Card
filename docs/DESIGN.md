# JOINT LIABILITY
## Complete Design Specification and Agent-Executable Build Roadmap
**Version 0.1 — working title, initial balance specification**

> **The unifying hook: Your next weapon is made from what your partner did before you swapped.**
>
> One partner supplies an ingredient. The other supplies its delivery mechanism. Switching between them turns the last action into part of the next attack—while also changing who is exposed to enemy fire.

All game rules and numerical values below are **proposed design specifications**, not claims of tested balance. The roadmap includes the tests and playable checkpoints needed to establish whether they work.

---

# 1. One-page pitch

## Hook line

**Two bodies. One nervous system. An irresponsible number of combinations.**

## Elevator pitch

*Joint Liability* is a single-player roguelike deckbuilder about two medically inseparable fugitives trying to repossess their own bodies from a corporate afterlife.

You control a **Source**, who produces unstable biological or electrical ingredients, and a **Shaper**, who turns those ingredients into delivery systems. Both share one deck and one energy pool. Only one occupies the exposed Front position at a time.

Play a Gore card with your Source, switch to your Shaper, and fire a Needle technique: you have built a high-pressure organ stapler. Switch back after using a Burst technique, then introduce Rot: the same system now produces an airborne contamination incident.

You are not collecting finished builds. You are collecting parts, altering their behavior, and finding combinations the company would strongly prefer you not discover.

Between fights, permanently **Graft two compatible cards together**, acquire relics that rewrite interaction rules, and decide which faction’s promises are least likely to contain an undisclosed organ-harvesting provision.

Runs are compact: **roughly 25–35 minutes for a successful run**, with occasional longer wins approaching 40 minutes. Persistent progression unlocks new possibilities rather than gradually turning the starting characters into invulnerable tax write-offs.

The visual identity is detailed, animated pixel art: industrial machinery, improvised surgery, institutional signage, and people who remain professionally irritated while something impossible eats the ceiling.

## Five design pillars

| Pillar | Commitment | Practical filter |
|---|---|---|
| **P1. The handoff is the invention.** | Swapping creates weapons, not merely a different portrait. | A major combat system must interact with handoffs, ingredients, exposure, or the shared deck. |
| **P2. Readable causes, outrageous consequences.** | The player can understand an individual decision even when its consequences become spectacular. | No hidden accuracy rolls, unexplained damage multipliers, or surprise intent changes. |
| **P3. Two lives, one compact run.** | The relationship between two bodies creates meaningful pressure without a management spreadsheet. | Cut systems that add routine maintenance, long downtime, or additional independent resource bars. |
| **P4. Permanent possibility, temporary power.** | Runs build powerful combinations; the hub expands what is possible. | Permanent unlocks must not be required statistical upgrades. |
| **P5. Violence with a straight face.** | The world is grotesque; its inhabitants treat the grotesque as an administrative inconvenience. | Humor comes from character, consequence, and institutional absurdity—not constant jokes over every action. |

## Locked assumptions

| Area | Decision |
|---|---|
| Team | You directing coding agents, with occasional human visual and playability review. |
| Initial platform | Browser-first, offline-capable after assets are loaded; Windows and macOS desktop browsers are the primary targets. |
| Later platforms | Desktop application packaging first; iOS only after the game and touch interface justify it. |
| Initial scope | One complete duo, two acts, one shared combat deck, no separate negotiation deck. |
| Long-term character structure | Three Sources × three Shapers = nine selectable pairings. |
| Positioning | Front and Reserve. Both characters remain present throughout combat. |
| Between combats | HP, deck changes, relics, and consumables persist. Block, statuses, Imprints, Protocols, and scheduled attacks reset. |
| Permanent character death | No roster permadeath. Either partner dying ends the run. |
| Art | Production-friendly pixel art, initially supported by simple animation and effects rather than hundreds of bespoke frames. |
| Networking | No multiplayer, accounts, cloud backend, or runtime AI generation in the initial game. |
| Commercial ambition | Build a strong passion-project release first. Do not make storefront integration a prerequisite for discovering whether combat is fun. |

## What is being retained—and what is being cut

| Reference mechanism from your brief | Decision | Reason |
|---|---|---|
| Telegraphed intent, energy, deck cycling | Retain | Supports P2 and brisk tactical decisions. |
| Passive items changing the rules | Retain aggressively | Central to P1 and P4. |
| Multiplicative interactions | Retain, with explicit calculation order | Supports spectacular builds without opaque arithmetic. |
| Dual-faction/class combinations | Adapt into Source–Shaper selection | Produces hybrid identities without managing a larger party. |
| Vertical lanes and persistent armies | Cut | Front/Reserve already supplies positional pressure. Lanes would compete with the handoff. |
| Full negotiation deck | Cut from the planned core release | A second complete card game would compete for content, interface, and balancing effort. |
| Faction relationships and delayed consequences | Retain in a compact event system | Adds identity and consequence without doubling the combat engine. |
| Stress, afflictions, and virtue checks | Cut | Two HP pools and the Imprint already supply the necessary pressure. A fourth major combat concern would dilute clarity. |
| Persistent roster permadeath | Cut | The protagonists should develop a recognizable relationship, not become disposable inventory. |
| Mid-run champion evolution | Adapt into relic-family transformations and Grafts | Reinforces the existing interaction system. |
| Unlock-driven replayability | Retain | New tools, characters, contracts, and difficulty settings—not mandatory permanent damage bonuses. |

One reference correction: Mega Crit describes *Slay the Spire 2*’s multiplayer feature as cooperative play for up to four players. That is not the same specification as one player controlling a party; the single-player duo here is an independent design choice. 

---

# 2. Core combat and run loop

## 2.1 The player’s recurring decision

The central question is:

> **Do I strengthen the ingredient I already have, hand it off now, or use a less efficient action to keep the right body alive?**

A typical turn contains three meaningful decisions, not ten unrelated systems:

1. Which cards should establish or strengthen the next combination?
2. When should the partners switch positions?
3. How much defense is necessary before ending the turn?

## 2.2 The duo

Every pairing consists of:

| Role | Function | Ingredient category |
|---|---|---|
| **Source** | Produces material: flesh, electricity, contamination, or unstable duplication. | **Material** |
| **Shaper** | Determines how the material is delivered. | **Form** |

Only one character occupies **Front**. The other occupies **Reserve**.

Most enemy attacks target Front. Some explicitly target Reserve, both characters, or a named character.

### Health-model fork

| Option | Benefit | Cost |
|---|---|---|
| One shared HP bar | Very easy to understand. | Positioning becomes mostly a combo switch. |
| Separate HP; either death ends the run | Makes exposure, healing, and handoffs meaningful. | Requires clear targeting and fair damage forecasts. |
| Separate HP; surviving partner continues | Creates dramatic recovery situations. | Requires a second combat ruleset for broken duos and substantially more balancing. |

**Recommendation: separate HP; either death ends the run.**

The bodies are not independent adventurers. Their shared relay organ fails if either half dies.

There are no unannounced revivals, injury rolls, or permanent roster losses.

## 2.3 Starting combat values

For the initial duo:

| Variable | Value |
|---|---:|
| Source maximum HP | 44 |
| Shaper maximum HP | 36 |
| Energy each player turn | 3 |
| Cards drawn each player turn | 5 |
| Maximum hand size | 10 |
| Free manual swaps each player turn | 1 |
| Cost of additional manual swaps | 1 Energy each |
| Maximum Imprint Potency | 3 |
| Starting deck size | 10 cards |
| Starting relics | 1 |
| Consumable capacity | 2 |
| Maximum consumables used per player turn | 1 |

Energy does not carry between turns.

If a draw would exceed 10 cards, excess drawn cards go directly to the discard pile. They do not count as entering the hand.

## 2.4 Lead and Support cards

Every card belongs to the Source, Shaper, or Crew.

**Lead card:** a card belonging to the character currently at Front.

**Support card:** a card belonging to the character currently in Reserve.

**Crew card:** usable independently of which character is at Front.

All three categories remain playable.

A Support card costs its normal Energy and performs its printed base effects. However, it:

- Does not create or strengthen an Imprint.
- Does not trigger a Reaction.
- Does not qualify for effects specifically requiring a Lead card.

This prevents the shared deck from constantly producing unusable hands.

A defensive card that says “gain Block” grants it to that card’s owner unless the card explicitly names Front, Reserve, or both characters.

## 2.5 The Imprint system

There is **one shared Imprint slot**.

An Imprint records:

```text
Owner
Ingredient category: Material or Form
Ingredient identity
Potency: 1–3
```

### Creating and strengthening an Imprint

When a Lead card with an ingredient finishes its base effects:

- With no existing Imprint, it creates its ingredient at its printed Prime value, normally 1.
- With the same owner and same ingredient, it adds its Prime value to the existing Potency, capped at 3.
- With the same owner but a different ingredient, it replaces the old ingredient and starts at its printed Prime value.
- With the opposite partner’s compatible ingredient stored, it triggers a Reaction.

Cards without an ingredient leave the Imprint unchanged.

Support cards leave it unchanged.

### Triggering a Reaction

A Reaction combines:

> **The stored ingredient + the incoming Lead card’s ingredient**

Its Potency is the **stored Imprint’s Potency**.

After the Reaction resolves, the incoming card leaves its own ingredient as the new Imprint at its printed Prime value.

Therefore, a handoff does not simply empty the system. It prepares the next handoff in the opposite direction.

### Important timing

The sequence is:

```text
Pay costs
→ Resolve base card effects
→ Resolve the Reaction, if eligible
→ Store the incoming ingredient
→ Finish the card
```

The current card’s Prime value strengthens the *next* handoff, not the Reaction it just triggered.

### Persistence

An Imprint survives:

- Other cards.
- Swapping.
- Ending the player turn.
- Enemy turns.

It does **not** survive the end of combat.

## 2.6 Swapping

The first manual swap each player turn costs 0 Energy.

Later manual swaps cost 1 Energy.

A card that says **“swap for free”** does not consume the manual free-swap allowance.

Swapping does not itself trigger a Reaction. It creates the opportunity for the next appropriate Lead card to do so.

This distinction matters: a player can switch to protect a wounded character, play defensive cards, and preserve the stored ingredient.

## 2.7 Enemy targeting

Every displayed intent uses one of four target rules:

| Target rule | Behavior |
|---|---|
| **Front** | Hits whoever occupies Front when the attack resolves. |
| **Reserve** | Hits whoever occupies Reserve when the attack resolves. |
| **Both** | Applies its printed damage separately to both characters. |
| **Locked** | Names a specific character when the intent is revealed. Swapping does not redirect it. |

Locked attacks must show the actual character portrait, not merely a generic crosshair.

Enemy intentions are selected before the player acts. Changing HP or formation cannot secretly replace the selected move.

Visible changes such as Weak or Strength update the displayed damage.

## 2.8 Turn sequence

### Player turn begins

1. Remove remaining Block from both player characters.
2. Refill Energy to 3.
3. Reset player-turn trigger limits and the free manual swap.
4. Resolve scheduled effects due at this player-turn start.
5. Draw 5 cards.
6. Allow player commands.

### Player actions

Cards, swaps, and consumables resolve as atomic commands. The interface may animate the results afterward, but animations do not determine rules timing.

### Player turn ends

1. Resolve player end-of-turn effects, including Fine Print.
2. Exhaust unplayed Fleeting cards.
3. Keep Retain cards.
4. Discard other cards.

### Enemy phase

1. Remove remaining enemy Block.
2. Resolve Poison.
3. Apply any announced escalation for this phase.
4. Living enemies execute their selected moves in displayed order.
5. Resolve Bleed after each enemy’s attack move.
6. Reduce turn-duration statuses.
7. Select and reveal the next enemy intents.

### End conditions

If either player character reaches 0 HP, the run ends immediately.

If all enemies are dead and neither player character is dead, combat ends.

Self-HP costs require enough HP to leave the paying character at **at least 1 HP**. They cannot be bypassed by killing the last enemy before the cost is collected.

## 2.9 Keywords and statuses

| Term | Exact rule |
|---|---|
| **Exhaust** | After being played, the card leaves the combat deck until combat ends. |
| **Retain** | The card remains in hand at player-turn end. |
| **Fleeting** | If unplayed at player-turn end, the card Exhausts. |
| **Unplayable** | Cannot be played normally. |
| **Protocol** | A card that installs a combat-long passive and moves to the deployed zone. It is not replayed on reshuffle. |
| **Block** | Absorbs direct damage. Unused Block expires at the start of that side’s next turn. |
| **Bleed X** | After an enemy completes an attack move, it loses X HP, then Bleed decreases by 1. A multi-hit move causes one Bleed tick. |
| **Poison X** | At enemy-phase start, the enemy loses X HP, then Poison decreases by 1. |
| **Weak X** | Attack damage is multiplied by 0.75 while active. Duration decreases by 1 at the afflicted side’s turn end. |
| **Exposed X** | Incoming direct damage is multiplied by 1.5 while active. Duration decreases by 1 at the afflicted side’s turn end. |
| **Strength X** | Adds X damage to each attack hit. It does not increase Poison, Bleed, or Reaction damage. |

Bleed, Poison, and self-HP costs bypass Block.

Multiple copies of a Protocol can stack, but each copy tracks its own explicitly limited trigger.

Protocols do not retroactively trigger on events that occurred before they were installed.

## 2.10 Damage calculation

Use integer outputs and explicit modifier stages.

For a normal attack hit:

```text
Damage =
floor(
  (printed damage + Strength + applicable flat attack bonuses)
  × outgoing attack multipliers
  × target direct-damage multipliers
)
```

For a Reaction hit:

```text
Damage =
floor(
  (printed reaction coefficient × Potency + flat reaction bonuses)
  × applicable reaction multipliers
  × target direct-damage multipliers
)
```

Do not round after every multiplier. Round at the end of the damage calculation.

Block is subtracted afterward.

Damage-related healing must use the stated healing rule, not accidentally use overkill damage.

## 2.11 Copies and delayed effects

A **repeat** is an additional resolution of a previously constructed effect packet.

Repeats:

- Do not count as playing the original card.
- Do not create or strengthen Imprints.
- Do not generate a new primary Reaction.
- Cannot recursively copy themselves.
- Do not reapply the player-side multipliers already included in their snapshot.

Target-side conditions such as Exposed are evaluated when the repeat actually hits.

A delayed repeat aimed at a dead enemy fizzles. It does not secretly choose another target.

For a newly triggered primary Reaction, if the initiating card killed its selected enemy, the Reaction may acquire the living enemy with the lowest spawn ID. This deterministic retarget is shown in the preview.

## 2.12 Run pacing

Your requested timings need one adjustment: **five minutes cannot be the ordinary fight length** if a successful run is supposed to fit around half an hour.

| Encounter | Target duration |
|---|---:|
| Ordinary fight | 45–120 seconds |
| Elite | 2–3 minutes |
| Boss | 3–5 minutes |
| Event or service node | 20–60 seconds |
| Successful run | 25–35 minutes |
| Longer successful run | Up to roughly 40 minutes |
| Early failed run | 6–12 minutes |

An overall average around 15 minutes is plausible when early failures are included. For example:

```text
25% of runs at 32 minutes
+ 75% at 9 minutes
= 14.75 minutes overall
```

That is an illustration, not a target that should be enforced by deliberately making most players lose.

---

# 3. Synergy architecture and complete initial content slice

## 3.1 The interaction layers

Build depth through four interacting layers:

| Layer | Function |
|---|---|
| **Cards** | Supply damage, defense, status effects, card flow, and ingredients. |
| **Reactions** | Combine a Material and Form into a predictable effect. |
| **Relics** | Change how those effects scale, repeat, refund resources, or interact with statuses. |
| **Grafts** | Permanently combine compatible card bodies without bypassing the two-character system. |

The important principle is that **an item should change the usefulness of several existing cards**, rather than merely complete one prescribed set.

## 3.2 Materials and Forms

### Materials

| Material | Identity |
|---|---|
| **Gore** | Direct damage and Bleed. |
| **Volt** | Strong immediate damage. |
| **Rot** | Poison and attrition. |
| **Echo** | Multiple hits and repeated delivery. |

### Forms

| Form | Identity |
|---|---|
| **Needle** | Concentrated single-target output. |
| **Burst** | Lower output per target, applied across enemies. |
| **Siphon** | Damage or contamination paired with sustain. |
| **Loop** | Lower immediate output followed by delayed output. |

There are **16 initial Material–Form combinations**.

These are data-defined recipes assembled from shared effect primitives. They are not 16 bespoke JavaScript functions.

## 3.3 Complete Reaction table

**P = stored Imprint Potency, from 1 to 3.**

“All enemies” means all living enemies at the moment that effect resolves.

| Material | Form | Reaction name | Exact effect |
|---|---|---|---|
| Gore | Needle | **Staple Gun** | Deal **6P** damage. Apply **2P Bleed**. |
| Gore | Burst | **Organ Donor** | Deal **3P** damage to all enemies. Apply **P Bleed** to each. |
| Gore | Siphon | **Transfusion** | Deal **4P** damage. Heal Front for **2P**. |
| Gore | Loop | **Second Incision** | Deal **4P** damage and apply **P Bleed** now. Repeat those effects at the next player-turn start. |
| Volt | Needle | **Live Ammunition** | Deal **9P** damage. |
| Volt | Burst | **Public Utility** | Deal **5P** damage to all enemies. |
| Volt | Siphon | **Power Transfer** | Deal **6P** damage. Front gains **3P Block**. |
| Volt | Loop | **Scheduled Outage** | Deal **5P** damage now and again at the next player-turn start. |
| Rot | Needle | **Contaminated Sample** | Apply **4P Poison**. |
| Rot | Burst | **Shared Air** | Apply **2P Poison** to all enemies. |
| Rot | Siphon | **Symbiotic Error** | Apply **3P Poison**. Heal Front for **P**. |
| Rot | Loop | **Recurring Infection** | Apply **2P Poison** now and again at the next player-turn start. |
| Echo | Needle | **Duplicate Claim** | Deal **4P** damage twice. |
| Echo | Burst | **Mass Duplication** | Deal **2P** damage to all enemies, twice. |
| Echo | Siphon | **Borrowed Tomorrow** | Deal **3P** damage twice. Heal Front for **P**, once. |
| Echo | Loop | **Administrative Recursion** | Deal **3P** damage twice now. Repeat those two hits at the next player-turn start. |

### Sustain limit

The duo has a shared **Reaction Recovery allowance of 6 HP per combat**.

Healing from Reactions cannot exceed that allowance. Unused healing is lost unless an item explicitly says otherwise.

This is not a general healing limit. An Exhaust healing card or consumable can still restore HP.

The allowance prevents a defensive build from farming unlimited healing against a weak surviving enemy. Its remaining amount appears in Siphon previews rather than occupying a permanent major HUD bar.

## 3.4 Initial duo: Morrow and Switch

### Morrow — Source

**44 maximum HP**

A repossessed cadaver whose original trade was industrial maintenance. He approaches supernatural violence as a problem usually solved by finding the correct wrench.

**Passive: Thick Blood**

After Morrow plays his first Gore Lead card each player turn, he gains **2 Block**.

### Switch — Shaper

**36 maximum HP**

A former emergency switchboard operator connected to a communications system that continued receiving calls after its subscribers died.

**Passive: Open Channel**

After Switch plays the first ingredient-bearing Shaper Lead card each player turn, draw **1 card**.

### Starting relic: Shared Warranty

After the first swap each player turn, the incoming Front character gains **3 Block**.

### Initial run loadout

- 40 Scrap.
- Shared Warranty.
- One Suture Kit.
- The 10-card deck below.
- Morrow initially at Front.
- No stored Imprint.

## 3.5 Starter deck

Numbers in the upgrade column replace the corresponding base values.

| Card | Copies | Owner | Cost | Ingredient | Base effect | Upgrade |
|---|---:|---|---:|---|---|---|
| **Repossess** | 2 | Source | 1 | Gore | Deal 6 damage. | 9 damage. |
| **Sealant** | 2 | Source | 1 | None | Owner gains 5 Block. | 8 Block. |
| **Test Fire** | 2 | Shaper | 1 | Needle | Deal 6 damage. | 9 damage. |
| **Safety Briefing** | 2 | Shaper | 1 | None | Owner gains 5 Block. | 8 Block. |
| **Shared Cover** | 1 | Crew | 1 | None | Both characters gain 3 Block. | 5 Block each. |
| **Change of Shift** | 1 | Crew | 0 | None | Swap for free. Exhaust. | Also draw 1 card. |

Unless specified otherwise, ingredient-bearing cards Prime at **1**.

## 3.6 Source card pool — 12 cards

**C = Common; U = Uncommon; R = Rare.**

| Card | Rarity | Cost | Ingredient | Base effect | Upgrade |
|---|---|---:|---|---|---|
| **Open Wound** | C | 1 | Gore | Deal 7 damage. Apply 2 Bleed. | 10 damage; 3 Bleed. |
| **Spoiled Sample** | C | 1 | Rot | Deal 4 damage. Apply 3 Poison. | 6 damage; 4 Poison. |
| **Bone Saw** | U | 2 | Gore | Deal 4 damage three times. | 5 damage three times. |
| **Ground Fault** | U | 1 | Volt | Deal 8 damage. | 11 damage. |
| **Double Take** | U | 1 | Echo | Deal 4 damage twice. | 5 damage twice. |
| **Blood Bank** | R | 0 | None | Pay 3 owner HP. Gain 1 Energy. Exhaust. | Pay 2 HP. |
| **Surgical Tape** | C | 1 | None | Owner gains 8 Block. Retain. | 11 Block. |
| **Controlled Decay** | C | 1 | Rot | Apply 5 Poison. | 7 Poison. |
| **Tenderize** | U | 1 | Gore | Deal 5 damage. Apply 1 Exposed. | 7 damage; 2 Exposed. |
| **Emergency Rebuild** | R | 1 | None | Heal owner for 7. Exhaust. | Heal 10. |
| **Thick Skin** | U | 1 | None | Protocol: after a Source Lead card, owner gains 3 Block; once per player turn. | 5 Block. |
| **Unlicensed Procedure** | R | 2 | Gore | Pay 3 owner HP. Deal 16 damage. | 21 damage; HP cost unchanged. |

For later character modularity, **Open Wound, Bone Saw, Thick Skin, and Unlicensed Procedure** are Morrow’s initial four signature cards. The other eight are the initial shared Source pool.

## 3.7 Shaper card pool — 12 cards

| Card | Rarity | Cost | Ingredient | Base effect | Upgrade |
|---|---|---:|---|---|---|
| **Nail Driver** | C | 1 | Needle | Deal 7 damage. | 10 damage. |
| **Fan Service** | C | 1 | Burst | Deal 4 damage to all enemies. | 6 damage each. |
| **Collection Notice** | C | 1 | Siphon | Deal 5 damage. | 8 damage. |
| **Scheduled Violence** | U | 1 | Loop | Deal 6 damage. | 9 damage. |
| **Switchblade** | R | 0 | None | Swap for free. Draw 1. Exhaust. | Draw 2. |
| **Insulated Coat** | C | 1 | None | Owner gains 7 Block. | 10 Block. |
| **Cross Examination** | U | 1 | Needle | Deal 5 damage. Draw 1. | 8 damage; draw unchanged. |
| **Broad Hint** | U | 2 | Burst | Deal 7 damage to all enemies. Apply 1 Weak to each. | 10 damage each. |
| **Friendly Leech** | U | 1 | Siphon | Deal 4 damage. Owner gains 4 Block. | 6 damage; 6 Block. |
| **Double Booking** | U | 2 | Loop | Deal 7 damage. Primes Loop at **2**. | 10 damage; Primes at **3**. |
| **Overclock** | R | 0 | None | Draw 2. Exhaust. | Draw 3. |
| **Operating Manual** | R | 1 | None | Protocol: after a primary Reaction, Front gains 3 Block; once per player turn. | 5 Block. |

**Nail Driver, Cross Examination, Double Booking, and Operating Manual** are Switch’s initial four signature cards. The remaining eight form the initial shared Shaper pool.

## 3.8 Crew card pool — 4 cards

| Card | Rarity | Cost | Base effect | Upgrade |
|---|---|---:|---|---|
| **Cover Both** | C | 1 | Both characters gain 5 Block. | 7 Block each. |
| **Cross Training** | C | 1 | Draw 2. | Draw 3. |
| **Reservoir** | U | 1 | Add 1 Potency to the existing Imprint, capped at 3. Retain. Requires an Imprint. | Add 2 Potency. |
| **Sudden Exit** | U | 1 | Swap for free. Incoming Front gains 8 Block. | 11 Block. |

**Total draftable initial pool: 28 cards.**

## 3.9 Negative and generated cards

| Card | Rule |
|---|---|
| **Invoice** | Unplayable. Fleeting. Generated only for the current combat. Its purpose is to consume a draw, not impose another payment interface. |
| **Fine Print** | Unplayable. If in hand at player-turn end, Front loses 1 HP; then discard it. A permanent deck liability until removed. |

Neither can be upgraded or Grafted.

## 3.10 Ten initial relics

Relics are unique within a run. There is no equipment-slot limit.

| Relic | Family | Tier | Exact effect |
|---|---|---|---|
| **Shared Warranty** | None | Starter | First swap each player turn: incoming Front gains 3 Block. |
| **Wetware Die** | Anatomy | Rare | Reaction direct damage against Bleeding enemies is multiplied by **1.5**. |
| **Clot Filter** | Anatomy | Common | When a primary Reaction applies Bleed, Front gains **2 Block per affected enemy**, at most once per enemy for that Reaction. |
| **Organ Bag** | Anatomy | Uncommon | Increase Reaction Recovery allowance from **6 to 10 HP per combat**. |
| **Parallel Port** | Circuit | Rare | The first primary Reaction each player turn repeats its largest direct-damage packet at **50%** output against the same target. No direct damage means no extra packet. |
| **Refund Capacitor** | Circuit | Uncommon | After the first Potency-3 primary Reaction each player turn, gain **1 Energy**. |
| **Arc Welder** | Circuit | Common | Reinforcing an existing Volt Imprint adds **1 additional Potency**, still capped at 3. |
| **Counterfeit Seal** | Forgery | Uncommon | The first Grafted card played each player turn costs **1 less Energy**, minimum 0. |
| **Carbon Copy** | Forgery | Rare | The first primary Loop Reaction each player turn schedules one additional repeat at **50%** output for the next player-turn start. |
| **Blank Badge** | Forgery | Common | Card rewards contain **4 options instead of 3**. |

For fractional repeats, each numeric output is rounded down separately. A result of 0 produces no effect.

## 3.11 Relic-family transformations

Possessing **three distinct relics from a family** grants that family’s transformation for the run.

These are additional behavior changes, not replacement characters.

| Family | Transformation | Effect |
|---|---|---|
| Anatomy | **Spare Parts** | After the first primary Gore Reaction each player turn, apply **1 Bleed to every living enemy**. |
| Circuit | **Live Wire** | Refund the Energy cost of the first paid manual swap each player turn. |
| Forgery | **Double Booked** | Once per combat, the first Grafted card repeats its base effects at **50%** output. This repeat does not Prime or trigger another Reaction. |

Transformations have visible sprite accents and sound cues, but do not require a new animation set.

Duplicate copies of a relic never count twice toward a threshold.

## 3.12 Permanent card combining: Grafting

### Design fork

| Approach | Strength | Problem |
|---|---|---|
| Only temporary Reactions | Cheapest implementation. | Misses the satisfaction of permanently constructing a strange custom card. |
| Restricted two-card Grafts | Permanent invention while retaining predictable rules. | Requires a compiler, preview, save representation, and careful eligibility rules. |
| Any card can merge with anything indefinitely | Very expressive. | Exponential rules complexity, unreadable cards, and severe recursion risks. |

**Recommendation: restricted two-card Grafts.**

### Graft eligibility

Two cards may be Grafted when:

- They belong to the same character role.
- Neither is already Grafted.
- Both are unupgraded.
- At most one is a Starter card.
- Both cost 1 or 2, and their combined cost is no more than 3.
- Neither is a Protocol.
- Neither has Exhaust, Retain, Fleeting, or Unplayable.
- Their declared target types match.
- Their effects use only the initial safe Graft operations: direct damage, Block, and status application.

Cards involving drawing, Energy generation, healing, swapping, scheduling, or card creation are ineligible in v1.

### Result

The Graft:

- Replaces both donor cards with one card.
- Costs the **sum** of their Energy costs.
- Resolves the first donor’s effects, then the second donor’s.
- Keeps exactly **one chosen ingredient**, selected when Grafting.
- Counts as one card play.
- Produces at most one primary Reaction.
- Can never be Grafted again.

Its power comes from **draw compression and combined effects**, not a free Energy discount.

### Example

Combine:

```text
Repossess:
1 Energy, 6 damage, Gore

Spoiled Sample:
1 Energy, 4 damage + 3 Poison, Rot
```

Result:

```text
2 Energy
Deal 6 damage.
Then deal 4 damage and apply 3 Poison.
Ingredient: Gore OR Rot, chosen at the Workshop.
```

This is two attack packets, not one 10-damage packet. Per-hit modifiers therefore remain meaningful.

A Graft can receive one upgrade. The player chooses which donor’s printed upgrade to apply; the other donor remains at base values.

### Price

First Graft in a run: **30 Scrap**.

Each later Graft costs **15 additional Scrap**:

```text
30 → 45 → 60 → 75
```

## 3.13 Consumables

All cost 0 Energy to use. Only one may be used per player turn.

| Consumable | Effect | Shop price |
|---|---|---:|
| **Suture Kit** | Heal one character for 12 HP. May also be used outside combat. | 25 Scrap |
| **Shock Bottle** | Deal 15 direct damage to one enemy. Does not Prime an Imprint. | 25 Scrap |
| **Smoke Form** | Both characters gain 8 Block. | 25 Scrap |

Only Suture Kit is usable outside combat.

## 3.14 Five initial enemies

All move sequences repeat unless otherwise stated.

| Enemy | HP | Move sequence | Tactical purpose |
|---|---:|---|---|
| **Claims Adjuster** | 30 | Front 7 → gain 6 Block and add 1 Invoice to discard → Front 10 | Basic intent reading and draw disruption. |
| **Taxidermy Drone** | 24 | Front 3×3 → Reserve 6 | Teaches that Reserve is not universally safe; multi-hit interactions matter. |
| **Compliance Slug** | 42 | Gain 10 Block → Front 12 | Rewards Poison, preparation, and timing. |
| **Unpaid Intern** | 20 | Front 5 → both characters 4 | On death, other living enemies gain 2 Strength. Makes kill order meaningful. |
| **Repo Foreman** — elite | 78 | Front 12 → Locked 14 → both characters 7 | Starts with 8 Block. Tests exposure management and mixed targeting. |

### Global anti-stall escalation

Beginning with enemy phase **7**, each living enemy gains **2 Strength at the beginning of every enemy phase**.

The next-phase increase is included in the displayed forecast.

This is a turn-based escalation rule, not a real-time timer.

## 3.15 Initial boss: The Head of Recovery

**150 HP**

A managerial head installed in a walking industrial copier. It prints incident reports while creating the incidents.

### Four-move cycle

| Move | Effect |
|---|---|
| **Performance Review** | Front takes 12 damage. |
| **Cross-Departmental Issue** | Both characters take 7 damage. |
| **Named in the Claim** | Locked character takes 18 damage. |
| **Budget Cuts** | Boss gains 14 Block; add 2 Invoices to the discard pile. |

### Phase change

At **75 HP or below**, the boss enters **Personal Involvement**.

From the next selected intent onward, all of its attack hits gain **+3 printed damage**.

An intent already displayed is not rewritten when the threshold is crossed.

No damage-type immunity. No ingredient suppression. The boss tests whether the player understands the duo rather than confiscating the build.

### Victory reward

After the Act 1 boss:

- Gain **50 Scrap**.
- Gain **5 Evidence**.
- Choose **1 of 3 eligible relics**.
- Heal each character for **8 HP**.
- Enter Act 2.

## 3.16 Additional compact-v1 enemies and final boss

The initial class slice above is sufficient for the first full act. The compact release adds three enemies and one final boss.

| Enemy | HP | Exact sequence |
|---|---:|---|
| **Senior Adjuster** | 44 | Front 10 → gain 9 Block and add 2 Invoices → Front 13 |
| **Twin-Rotor Drone** | 34 | Front 4×3 → Reserve 9 |
| **Union Defector** | 48 | Front 11 → both characters 6 → gain 12 Block and 1 Strength |

### Final boss: The Acting Body

**210 HP**

The company’s executive body has survived the loss of every individual executive. It considers this a successful restructuring.

| Move | Effect |
|---|---|
| **Two-Faced** | Both characters take 9 damage. |
| **Direct Report** | Locked character takes 20 damage. |
| **Resource Allocation** | Gain 18 Block; add 2 Invoices to discard. |
| **Unscheduled Inspection** | Front takes 24 damage. |

**Trait — Joint Account:** Beginning with player turn 2, if the previous player turn produced no primary Reaction, the boss gains **8 Block** at player-turn start.

At **105 HP or below**, its next selected intent begins phase 2:

- Attack hits gain **+2 printed damage**.
- Resource Allocation becomes **12 damage to Front and 12 Block**, without generating Invoices.

The final boss awards **5 Evidence** and ends the run.

## 3.17 Demonstrated synergy chains

### A. Bleeding targets become electrical infrastructure

Starting state:

- Stored Gore Imprint at Potency 2.
- Target has Bleed and Exposed.
- Wetware Die and Parallel Port are equipped.

Play Nail Driver as a Lead card.

```text
Nail Driver:
floor(7 × 1.5 Exposed) = 10 damage

Staple Gun:
6 × 2 Potency = 12
12 × 1.5 Wetware × 1.5 Exposed = 27 damage

Parallel Port:
Player-modified packet before target mitigation = 18
50% copy = 9
floor(9 × 1.5 Exposed) = 13 damage
```

**Immediate total: 50 damage, plus 4 additional Bleed.**

That is a substantial payoff from interacting rules—not a card that simply says “deal 50.”

### B. Contamination becomes a scheduling problem

Rot + Loop applies Poison now and again next turn.

Carbon Copy adds a smaller additional delayed application.

Because Poison applications stack, the delayed packet changes the next several enemy phases. It is not merely a second floating damage number.

### C. Compression becomes a build

Graft an attack and a status applicator.

Counterfeit Seal discounts the first Graft each turn.

Double Booked repeats its safe base effects once per combat.

The Graft still leaves one ingredient, so the other partner remains necessary.

### D. Multihit versus big-hit builds

Echo produces multiple hits.

Volt produces a larger single hit.

An item adding flat damage to each packet favors Echo. An item copying the single largest packet favors Volt. Neither needs a bespoke “Echo build” or “Volt build” instruction.

## 3.18 Content-expansion rule

Every new relic must demonstrate useful interactions with at least:

- **3 existing cards**;
- **2 different Reactions**;
- **1 build that is not its most obvious thematic match**.

Every new card must have a reason to exist beyond being a larger or smaller number on an existing card.

These are authoring acceptance criteria, not claims that raw combinatorial counts prove depth.

---

# 4. Meta-progression

## 4.1 The hub: The Break Room

The hub is a reclaimed employee welfare facility beneath the company’s body-storage complex.

It contains four functional locations:

| Location | Function |
|---|---|
| **Locker** | Choose Source, Shaper, and optional starting contract. |
| **Evidence Board** | Purchase discovered unlock packs and view narrative progress. |
| **Test Bench** | Practice with discovered cards and Reactions without rewards. |
| **Lift** | Select Inspection difficulty and begin a run. |

All four basic functions are available immediately.

The hub should take **under 30 seconds to navigate** when the player already knows what they want.

There is no town-management layer, daily income collection, building queue, or injured-roster maintenance.

## 4.2 Currencies

| Currency | Persistence | Source | Use |
|---|---|---|---|
| **Scrap** | Current run only | Encounters, events, treasure | Cards, relics, consumables, removal, upgrades, Grafts |
| **Evidence** | Permanent | Encounter completion and first-time discoveries | New content packs, characters, narrative unlocks |

### Evidence income

| Achievement | Evidence |
|---|---:|
| Win an ordinary fight | 1 |
| Win an elite fight | 2 |
| Defeat a boss | 5 |
| Discover a Reaction for the first time on that profile | 2 |

Evidence banks when the qualifying encounter or discovery transaction is committed.

Death does not delete banked Evidence.

Reloading or repeating a reward claim cannot award it twice.

## 4.3 Initial unlock tree

The first profile begins with **20 of the 28 draftable cards**.

All 10 initial relics are available from the start so that the relic pool is not starved during early runs.

| Unlock | Cost | Prerequisite | Cards unlocked |
|---|---:|---|---|
| **Unsafe Practice** | 6 Evidence | Complete one combat | Blood Bank; Unlicensed Procedure |
| **Alternate Current** | 8 Evidence | Discover 2 Reactions | Ground Fault; Double Take |
| **Unscheduled Work** | 10 Evidence | Complete one elite or boss | Switchblade; Double Booking |
| **Office Equipment** | 12 Evidence | Unlock any previous pack | Overclock; Operating Manual |

Total initial unlock cost: **36 Evidence**.

The Test Bench can expose the full implemented pool in a clearly labeled testing mode. That mode does not award progression.

### Anti-dilution policy

Unlocks should expand the pool without making a selected character’s identity disappear.

Reward generation operates on role and signature categories, rather than choosing indiscriminately from every card implemented in the entire game.

Unlocked but unselected characters’ exclusive cards do not enter the current run’s ordinary pool.

## 4.4 Long-term cast

The planned six-character roster is:

| Character | Slot | HP | Signature behavior |
|---|---|---:|---|
| **Morrow** | Source | 44 | First Gore Lead card each turn grants owner 2 Block. |
| **Kiln** | Source | 40 | First Volt Lead card each turn leaves an Imprint with +1 additional Prime, capped at 3. |
| **Null** | Source | 38 | First primary Echo Reaction each turn grants Reserve 4 Block. |
| **Switch** | Shaper | 36 | First ingredient-bearing Shaper Lead card each turn draws 1. |
| **Mercy** | Shaper | 40 | Reaction Recovery allowance +3; first primary Siphon Reaction each turn grants owner 2 Block. |
| **Penny** | Shaper | 34 | First scheduled Loop repeat batch resolving each player turn grants 1 Energy. |

### Starter variations

All characters retain the same basic ten-card structure.

- Kiln replaces Repossess with **Arc Test**: 1 Energy, 6 damage, Volt.
- Null replaces Repossess with **Bad Memory**: 1 Energy, 3 damage twice, Echo.
- Mercy replaces Test Fire with **Billing Cycle**: 1 Energy, 5 damage, Siphon.
- Penny replaces Test Fire with **Tomorrow’s Problem**: 1 Energy, 5 damage, Loop.

Upgrades add **3 total damage** to Arc Test and Billing Cycle/Tomorrow’s Problem. Bad Memory upgrades to **4 damage twice**.

Character unlock costs:

- Kiln: **16 Evidence**.
- Mercy: **16 Evidence**.
- Null: **24 Evidence**, after one run victory.
- Penny: **24 Evidence**, after one run victory.

These are later roadmap items, not additional prerequisites for the initial release.

## 4.5 Inspection difficulty

Inspection levels are optional and cumulative.

A victory at the highest unlocked level unlocks the next level.

| Level | Added rule |
|---:|---|
| 0 | Baseline rules. |
| 1 | Ordinary enemies gain 10% maximum HP, rounded up. |
| 2 | Elites and bosses gain 10% maximum HP, rounded up. |
| 3 | Every enemy attack hit gains +1 damage. |
| 4 | Each player character starts with maximum HP reduced by 4 for that run. |
| 5 | All Scrap prices increase by 20%, rounded up, including services. |
| 6 | Draw 4 instead of 5 cards on the first player turn of each combat. |
| 7 | Bosses gain 1 Strength after every third completed enemy phase. |
| 8 | Rest healing decreases from 18 to 12. Post-Act-1 healing decreases from 8 to 6 per character. |
| 9 | Add 1 Fine Print to the starting deck. |
| 10 | Global enemy escalation begins on enemy phase 5 instead of 7. |

No level hides intentions or introduces accuracy rolls.

Higher difficulty tests planning and resource allocation. It does not make the information interface less honest.

---

# 5. Narrative, factions, and non-combat systems

## 5.1 Premise

A company called **Continuity** has solved mortality in the least generous way possible.

It owns the reconstruction process, the replacement bodies, and the legal identities attached to them.

Morrow and Switch are the result of a cost-saving experiment: two reconstructed people operating through one divided relay organ. Their debt is shared. So is their termination clause.

Each run is an attempt to reach the company’s executive tissue archive and acquire—or destroy—the records that make their bodies company property.

Repeated runs are justified by reconstruction. Persistent discoveries represent evidence the company failed to erase.

## 5.2 Tone rules

The violence is vivid. The dialogue is restrained.

An enemy can be a walking printer full of teeth. Its line should be:

> “Please remain in the designated grievance area.”

Not:

> “Whoa, this is totally crazy!”

Morrow is practical. Switch is precise and increasingly annoyed. Neither exists merely to deliver quips.

### Writing limits

| Element | Budget |
|---|---:|
| Ordinary event body | Maximum 80 words |
| Choices per event | 2–3 |
| Choice label | Maximum 18 words |
| Mandatory banter per node | Maximum 2 short lines |
| Boss introduction | Maximum 60 words |
| Repeat-view dialogue | Skippable immediately |

No full voice acting in v1. Short processed vocal sounds are enough.

## 5.3 Factions

| Faction | Identity | Preferred interactions |
|---|---|---|
| **Continuity Office** | Administrators who believe ownership is a physiological condition. | Contracts, Protocols, controlled procedures |
| **Free Tissue Union** | Workers and replacement organs attempting collective bargaining. | Healing, bodily sacrifice, Grafting |
| **The Last Broadcast** | A pirate signal insisting that reality is a syndicated program. | Echo, Loop, duplication |

### Standing

Each faction has persistent Standing from **−3 to +3**.

Event choices change it in increments of 1 unless specified otherwise.

Standing affects:

- Which optional contracts are available.
- Which event variants can appear.
- Dialogue and endings.

It does **not** grant automatic permanent discounts, damage bonuses, or starting HP.

At **+2 Standing**, a faction’s starting contract becomes available.

## 5.4 Negotiation without a second deck

There is no separate negotiation combat in v1.

Instead, events support deterministic **leverage checks** based on things the player already owns:

- A Protocol.
- A Grafted card.
- A card with Echo or Loop.
- A previous favor.
- Sufficient Scrap or HP to pay a stated cost.

A choice is either available or unavailable. The player is not asked to gamble a run on an unexplained persuasion percentage.

This preserves the part of social systems that matters here: **your build and earlier choices change what you can do outside combat**.

## 5.5 Optional starting contracts

Only one contract may be selected.

“No Contract” is always available.

| Contract | Benefit | Cost |
|---|---|---|
| **Clean Hands** — Continuity | Start with +35 Scrap. | Add 1 Fine Print to the starting deck. |
| **Meat Dividend** — Union | Start with an additional Suture Kit. | Source maximum HP is reduced by 6 for the run. |
| **Pirate Signal** — Broadcast | Loop Reaction direct-damage packets gain a ×1.25 player-side multiplier. | Start each combat’s first player turn with 2 Energy instead of 3. |

Contract costs stack with Inspection modifiers.

The second Suture Kit uses the second consumable slot; it does not increase capacity.

## 5.6 Complete initial event set

HP payments require the paying character to remain above 0 HP.

| Event | Choices and exact consequences |
|---|---|
| **A Spare Organ** | Pay 20 Scrap to heal a chosen character for 12; or pay 6 chosen-character HP to gain 25 Scrap; or leave. |
| **The Volunteer** | Pay 6 Front HP to free a worker: Union Standing +1 and set `rescued_worker`; or surrender them for 35 Scrap: Office +1, Union −1; or leave. |
| **Terms and Conditions** | Gain 45 Scrap and add Fine Print: Office +1 and set `signed_contract`; or destroy the document: gain 1 Evidence and Office −1; or leave. |
| **Dead Air** | Pay 20 Scrap to upgrade one eligible Loop card: Broadcast +1; or destroy the equipment for 20 Scrap: Broadcast −1; or leave. |
| **Unmarked Refrigerator** | Take a Suture Kit and add Fine Print; or pay 15 Scrap for the Suture Kit without Fine Print; or leave. Requires an empty consumable slot to take it. |
| **Internal Transfer** | Pay 8 HP from one character to heal the other for 12; or leave. |
| **Warranty Inspection** | Present a Protocol in the deck to gain 25 Scrap and Office +1; or surrender one Graft for 60 Scrap and Office −1; or leave. Surrender removes that Graft. |
| **The Free Sample** | Pay 4 HP from each character to add Ground Fault or Double Take; or decline. Event acquisition is permitted even before the relevant unlock pack. |
| **Body Count** | Remove one non-Starter Attack for 40 Scrap and Union −1; or pay 20 Scrap to heal both characters for 6 and gain Union +1; or leave. |
| **The Witness** | Requires `rescued_worker`, Act 2. Choose one: free card removal, heal one character for 18, or gain 60 Scrap. Union +1; consume the flag. |
| **Quiet Settlement** | Requires `signed_contract`, Act 2. Pay 30 Scrap to remove one Fine Print; or surrender one non-Starter card to remove one Fine Print; or ignore the offer. A successful settlement grants Office +1 and consumes the flag. |
| **Station Identification** | Add Double Take or Scheduled Violence. Free with Broadcast Standing at least +2 or an Echo card in the deck; otherwise costs 25 Scrap. Leaving is always available. |

### Delayed consequences

The Volunteer creates an Act 2 opportunity; it does not immediately refund its cost.

The Witness replaces the appropriate Act 2 event offer at row 2.

Quiet Settlement appears as an Act 2 row-5 event offer when its flag is present.

Choosing a different map branch can mean declining that follow-up. The interface states that the opportunity exists; it does not force the player onto it.

## 5.7 Endings

The final boss is the same mechanical victory condition.

After victory, the player chooses:

- **Destroy the ownership archive.**
- **Sell the archive to a faction.**

Standing and prior flags determine the text and hub changes.

No ending permanently increases starting combat power.

---

# 6. Map, nodes, and encounter design

## 6.1 Run structure

A complete run has:

- **2 acts**.
- **7 visited rows per act**.
- **14 visited nodes total**.
- One boss at the end of each act.

A player chooses one reachable node at each row.

## 6.2 Map structure

Each act contains this arrangement:

| Row | Available nodes |
|---:|---|
| 1 | 1 ordinary combat |
| 2 | 3 nodes: combat, event, event |
| 3 | 2 nodes: shop, Workshop |
| 4 | 3 nodes: combat, elite, combat |
| 5 | 3 nodes: treasure, event, combat |
| 6 | 1 rest |
| 7 | 1 boss |

That is **14 generated nodes per act**, of which the player visits 7.

### Connections

Use fixed connectivity templates with seeded node content:

- Row 1 reaches all row-2 nodes.
- Left row-2 node reaches shop.
- Middle row-2 node reaches both services.
- Right row-2 node reaches Workshop.
- Shop reaches left combat or elite at row 4.
- Workshop reaches elite or right combat.
- Outer row-4 nodes reach adjacent row-5 nodes.
- Middle row-4 node reaches all row-5 nodes.
- All row-5 nodes converge on rest, then boss.

This creates route consequences without the generation complexity or visual sprawl of a much larger map.

## 6.3 Node functions

| Node | Function |
|---|---|
| Combat | Ordinary fight, Scrap, card reward |
| Elite | Harder fight, more Scrap, stronger card rarity distribution, relic |
| Event | Compact deterministic choices |
| Shop | Purchases, card removal |
| Workshop | Graft or paid upgrade |
| Treasure | Choose 1 of 2 relics; gain 20 Scrap |
| Rest | Heal or upgrade |
| Boss | Act climax and transition or victory |

## 6.4 Rewards

| Encounter | Scrap | Card reward | Relic | Evidence |
|---|---:|---|---|---:|
| Ordinary | 15 | Choose 1 of 3; may skip | None | 1 |
| Elite | 35 | Choose 1 of 3; may skip | Choose 1 of 2 | 2 |
| Act 1 boss | 50 | None | Choose 1 of 3 | 5 |
| Final boss | None needed | None | None | 5 |

Blank Badge adds one option to card rewards.

### Card rarity

| Reward | Common | Uncommon | Rare |
|---|---:|---:|---:|
| Ordinary | 65% | 30% | 5% |
| Elite | 20% | 60% | 20% |

Each offer contains at least one Source card and one Shaper card.

Additional slots choose role with weights:

```text
Source 40
Shaper 40
Crew 20
```

Within a role, unavailable rarity categories are removed and the remaining rarity weights are normalized.

No duplicate definition appears within one offer.

Skipping does not improve a hidden pity counter.

## 6.5 Shop prices and stock

| Item/service | Price |
|---|---:|
| Common card | 35 Scrap |
| Uncommon card | 55 Scrap |
| Rare card | 80 Scrap |
| Common relic | 80 Scrap |
| Uncommon relic | 110 Scrap |
| Rare relic | 150 Scrap |
| Consumable | 25 Scrap |
| First card removal | 45 Scrap |
| Each later removal | Previous price +15 Scrap |
| Workshop upgrade | 25 Scrap |

Shop stock:

- 2 Source cards.
- 2 Shaper cards.
- 1 Crew card.
- 2 relics.
- 2 consumables.
- Card-removal service.

No shop reroll in v1.

Stock is generated once and saved. Reloading does not refresh it.

## 6.6 Rest choices

Choose one:

- Heal one character for **18 HP**.
- Upgrade one eligible card for free.

Rest does not fully restore the duo.

Grafting remains a Workshop identity, rather than another choice added to every service screen.

## 6.7 Initial encounter library

### Act 1 ordinary encounters

- Claims Adjuster.
- Compliance Slug.
- Two Taxidermy Drones.
- Taxidermy Drone + Unpaid Intern.
- Claims Adjuster + Unpaid Intern.

The first encounter cannot be a two-enemy formation.

### Act 1 elite

- Repo Foreman.

### Act 2 ordinary encounters

- Senior Adjuster + Taxidermy Drone.
- Two Twin-Rotor Drones.
- Union Defector + Unpaid Intern.
- Compliance Slug + Taxidermy Drone.

### Act 2 elites

- Veteran Repo Foreman: **99 HP**, attack hits gain **+3** over its base definition.
- Two Union Defectors.

Maximum simultaneous enemies in v1: **3**, even though the initial encounter list primarily uses one or two.

## 6.8 Generation constraints

Every generated act must satisfy:

- Boss reachable from every valid current route.
- No disconnected nodes.
- At least one reachable service choice.
- No elite in the first row.
- No duplicate exact encounter in consecutive combat nodes.
- Delayed-event replacements preserve map connectivity.
- A run never requires an item the player might not possess to advance.
- No mandatory purchase.

These are generator tests, not manual checklist items.

---

# 7. Art, interface, experience, and audio

## 7.1 Art direction

**Detailed pixel art with controlled animation, not “pixel-looking” high-resolution paintings.**

The setting should combine:

- Municipal-industrial interiors.
- Medical machinery built to inappropriate scales.
- Cheap office materials surviving impossible disasters.
- Characters whose silhouettes remain readable beneath modifications.
- Wet biological effects against rigid mechanical surroundings.

The grotesque elements should be specific: a stapler that feeds on cartilage is more memorable than generic red particles.

## 7.2 Production dimensions

| Asset | Initial specification |
|---|---|
| UI design reference | 1280×720 |
| Pixel-art stage | 640×360, scaled cleanly |
| Standard character sprite area | 96×96 pixels |
| Large boss sprite area | Up to 192×160 pixels |
| Relic icons | 32×32 pixels |
| Status icons | 16×16 and 32×32 exports |
| Card illustrations | 128×96 pixels |
| Initial palette | 32 master colors, with controlled per-act subsets |

Do not force body text into a tiny pixel font. The artwork can be pixel-based while the interface remains readable.

## 7.3 Animation strategy

### First playable

Static sprites with:

- Position interpolation.
- Recoil.
- Flash masks.
- Weapon or effect overlays.
- Simple death displacement.

This proves timing without waiting for final art.

### Compact release

Prioritize animation in this order:

1. Swap.
2. Reaction.
3. Hit response.
4. Enemy attack anticipation.
5. Idle.
6. Death.

A strong swap animation matters more than a 20-frame idle loop.

Proposed timing:

| Event | Default presentation time |
|---|---:|
| Card movement | 120 ms |
| Swap | 220 ms |
| Ordinary hit | 120–180 ms |
| Primary Reaction reveal | 250–400 ms |
| Enemy move | 250–600 ms |
| Large sequence | Coalesced to avoid several seconds of repetitive numbers |

Offer **1×, 1.5×, and 2×** animation speeds.

Reduced-motion mode disables screen shake and uses short fades rather than position jolts.

## 7.4 AI art and Blender pipeline

Use AI generation primarily for:

- Character concepts.
- Enemy shape exploration.
- Prop concepts.
- Card illustration concepts.
- Background composition.

Then standardize:

- Pixel grid.
- Palette.
- Anchor point.
- Scale.
- Outline treatment.
- Light direction.

Do not assume separately generated frames will automatically form a coherent animation.

Blender is useful for:

- Mechanical props.
- Consistent orthographic poses.
- Camera-matched environmental elements.
- Rotating machinery.
- Reference renders that are later simplified into the pixel style.

Do not introduce runtime 3D merely because Blender is available.

Every asset needs a provenance record: origin, generation or purchase date, license information where applicable, and whether manual cleanup remains outstanding.

## 7.5 Combat interface

### Upper area

Enemy sprites, HP, statuses, and exact intents.

### Center

The two characters, visibly separated into Front and Reserve.

Between them: a large, compact Imprint display:

```text
GORE ••○
Stored by Morrow
```

### Lower area

Hand, Energy, swap control, consumables, and End Turn.

### When hovering or selecting a card

Show:

- Its base effect.
- Whether it is Lead or Support.
- The prospective Reaction.
- Resulting Imprint.
- Exact cost after modifiers.
- Expected target and HP/Block changes.
- Relevant remaining limits.

Example:

```text
NAIL DRIVER — LEAD

Base: 7 damage
Reaction: Staple Gun, Potency 2
12 damage + 4 Bleed
Afterward: Needle, Potency 1
```

Do not require opening the encyclopedia to understand the immediate action.

## 7.6 Information without spoiling hidden state

The preview may calculate exact outcomes from visible information.

It must not reveal:

- The identities of unknown upcoming draws.
- Future reward rolls.
- Undiscovered event results not currently offered.

“Draw 2” remains “Draw 2,” even though the engine could inspect the hidden deck order.

This separation needs an automated information-leak test.

## 7.7 Discovery

The encyclopedia begins with incomplete Reaction entries.

When the player is about to execute a new combination, the preview explains what it will do. Executing it permanently records it.

The mystery is **finding useful combinations**, not guessing whether a button secretly does something else.

## 7.8 Initial guidance

Teach the loop through three contextual prompts:

| Trigger | Guidance |
|---|---|
| First ingredient-bearing Lead card | Explain the stored Imprint. |
| First useful swap opportunity | Show the prospective combined effect. |
| First enemy phase with a dangerous target | Explain Front, Reserve, or Locked targeting as appropriate. |

Prompts dismiss permanently after use and can be disabled immediately.

No mandatory tutorial run after the first attempt.

End Turn should warn about obvious overlooked opportunities, but not prescribe an optimal move:

> “You still have 2 Energy and a free swap.”

The warning can be disabled.

## 7.9 Audio direction

**Industrial MIDI with an actual hook.**

Think short, memorable synth motifs, distorted percussion, mechanical rhythm, and a little cheap workstation menace—not an uninterrupted wall of ominous noise.

Initial music budget:

| Track | Tempo | Structure |
|---|---:|---|
| Break Room | 90 BPM | 16-bar loop |
| Act 1 | 128 BPM | 32-bar loop |
| Act 2 | 136 BPM | 32-bar loop |

Boss music reuses the act’s tempo and core motif with additional percussion and distortion layers.

Initial SFX budget: **18 core effects**, with pitch and layering variations rather than a unique file for every card.

Reaction Potency raises the confirmation sound by **2 semitones per level above Potency 1**.

Separate volume controls:

- Master.
- Music.
- Effects.

Muting audio must not alter simulation timing or state.

---

# 8. Data architecture and content schemas

## 8.1 Architectural rule

> **The engine knows operations. Content supplies combinations of those operations.**

The engine may understand:

- Damage.
- Draw.
- Apply status.
- Swap.
- Modify an Imprint.
- Schedule a packet.
- Change a price.
- Check a flag.

It must not contain logic such as:

```ts
if (card.id === "open_wound") {
  // special behavior
}
```

Cards, relics, enemies, encounters, events, characters, unlocks, and difficulty modifiers are structured data.

No executable JavaScript strings inside content.

No `eval`.

No runtime model calls to invent effects.

## 8.2 File structure

```text
joint-liability/
  AGENTS.md
  package.json
  package-lock.json

  docs/
    DESIGN.md
    RULES.md
    CONTENT_GUIDE.md
    ARCHITECTURE.md
    DECISIONS.md
    STATUS.md
    milestones/

  src/
    engine/
      state/
      commands/
      effects/
      triggers/
      targeting/
      rng/
      replay/
      run/
      progression/

    content/
      loader/
      compiler/
      validation/

    client/
      ui/
      stage/
      animation/
      audio/
      input/

    platform/
      browser/
      desktop/
      mobile/

  content/
    cards/
    relics/
    reactions/
    enemies/
    encounters/
    events/
    characters/
    contracts/
    unlocks/
    difficulties/

  schemas/
    common.schema.json
    card.schema.json
    relic.schema.json
    reaction.schema.json
    enemy.schema.json
    encounter.schema.json
    event.schema.json
    character.schema.json
    save.schema.json

  tests/
    unit/
    fixtures/
    properties/
    simulations/
    browser/

  tools/
    validate-content/
    simulate/
    inspect-replay/
    content-report/
    asset-audit/
```

## 8.3 Validation format

Use **JSON Schema Draft 2020-12** with Ajv.

JSON Schema supplies the structured validation contract; Ajv provides the validator implementation. Both have official documentation covering this approach. 

The schema files are authoritative.

TypeScript types are generated from them or derived through a single build process. Do not maintain two independent definitions that can silently disagree.

All schemas reject unknown fields by default.

## 8.4 Common expression schema

Content values use a bounded expression language.

Allowed forms:

```ts
type ValueExpr =
  | { const: number }
  | { param: string }
  | { stat: StatReference }
  | { add: [ValueExpr, ValueExpr] }
  | { multiply: [ValueExpr, ValueExpr] };
```

Constraints:

- Numeric content values are integers.
- Expression nesting depth is at most **4**.
- Parameter references must exist.
- Stat references come from an allowlist.
- Costs must resolve to valid nonnegative integers.
- No expressions can access arbitrary object properties.

Multipliers are stored as basis points:

```text
10000 = ×1
15000 = ×1.5
5000 = ×0.5
```

## 8.5 Effect schema

Each operation is a discriminated union with its own required fields.

| Operation | Required payload |
|---|---|
| `damage` | target, amount expression, hit count, damage category |
| `block` | target, amount expression |
| `heal` | target, amount expression, recovery-budget category |
| `apply_status` | target, status ID, amount expression |
| `draw` | amount expression |
| `gain_energy` | amount expression |
| `swap` | free or normal-cost mode |
| `boost_imprint` | amount expression |
| `add_card` | definition ID, destination, temporary/permanent flag |
| `install_protocol` | validated trigger definition |
| `schedule_packet` | timing, packet definition |
| `repeat_packet` | packet reference, multiplier, timing |
| `gain_scrap` | amount expression |
| `gain_evidence` | amount expression |
| `change_standing` | faction ID, integer amount |
| `set_flag` | flag ID, value |
| `remove_card` | validated selected-card reference |
| `upgrade_card` | validated selected-card reference |

Self-HP payments belong in the **cost schema**, not as conveniently reorderable effects.

Content cannot create its own new operation name.

## 8.6 Card schema

Required fields:

| Field | Type/rule |
|---|---|
| `schemaVersion` | Integer, initially 1 |
| `id` | Unique stable string |
| `name` | Localized-text key or initial English string |
| `owner` | `source`, `shaper`, or `crew` |
| `category` | `attack`, `skill`, `protocol`, or `status` |
| `rarity` | `starter`, `common`, `uncommon`, `rare`, or `generated` |
| `parameters` | Named base/upgraded integer values |
| `energyCost` | Value expression |
| `additionalCosts` | Validated cost array |
| `target` | Enumerated target-selection contract |
| `ingredient` | Material, Form, or null; includes Prime value |
| `keywords` | Unique keyword array |
| `effects` | Ordered validated effect array |
| `graftEligible` | Boolean, additionally checked by semantic validation |
| `unlockId` | Stable unlock reference or null |
| `artId` | Asset reference |

### Example card data

```json
{
  "schemaVersion": 1,
  "id": "source.open_wound",
  "name": "Open Wound",
  "owner": "source",
  "category": "attack",
  "rarity": "common",
  "parameters": {
    "damage": { "base": 7, "upgraded": 10 },
    "bleed": { "base": 2, "upgraded": 3 }
  },
  "energyCost": { "const": 1 },
  "additionalCosts": [],
  "target": "enemy",
  "ingredient": {
    "kind": "material",
    "id": "gore",
    "prime": { "const": 1 }
  },
  "keywords": [],
  "effects": [
    {
      "op": "damage",
      "target": "selected_enemy",
      "amount": { "param": "damage" },
      "hits": 1,
      "category": "attack"
    },
    {
      "op": "apply_status",
      "target": "selected_enemy",
      "status": "bleed",
      "amount": { "param": "bleed" }
    }
  ],
  "graftEligible": true,
  "unlockId": null,
  "artId": "card.open_wound"
}
```

Card text should be rendered from these effects and parameters where practical. Flavor text is separate.

## 8.7 Relic schema

Required fields:

```text
schemaVersion
id
name
rarity
family
modifiers[]
triggers[]
unlockId
artId
```

A modifier declares:

```text
channel
condition
operation
value
priority
```

A trigger declares:

```text
event
filter
effects[]
limit
priority
```

A limit contains:

```text
scope: command | turn | combat | run
count: positive integer
keying rule: relic instance | target | source
```

### Example relic data

```json
{
  "schemaVersion": 1,
  "id": "relic.wetware_die",
  "name": "Wetware Die",
  "rarity": "rare",
  "family": "anatomy",
  "modifiers": [
    {
      "channel": "reaction.direct.multiplier",
      "condition": {
        "target_has_status": "bleed"
      },
      "operation": "multiply",
      "value": 15000,
      "priority": 100
    }
  ],
  "triggers": [],
  "unlockId": null,
  "artId": "relic.wetware_die"
}
```

## 8.8 Enemy schema

Required fields:

```text
schemaVersion
id
name
maxHp
startingBlock
moves[]
ai
traits[]
phases[]
artId
```

Each move contains:

```text
id
intent label
target-selection rule
ordered effects[]
```

The initial AI schema supports:

- Fixed cycle.
- Explicit opening move followed by a cycle.
- Phase-specific cycle replacement.

It does not require behavior trees or a scripting language.

### Example enemy data

```json
{
  "schemaVersion": 1,
  "id": "enemy.claims_adjuster",
  "name": "Claims Adjuster",
  "maxHp": 30,
  "startingBlock": 0,
  "moves": [
    {
      "id": "stamp",
      "label": "Stamp",
      "target": "front",
      "effects": [
        {
          "op": "damage",
          "target": "intent_target",
          "amount": { "const": 7 },
          "hits": 1,
          "category": "attack"
        }
      ]
    },
    {
      "id": "paperwork",
      "label": "Fine Print",
      "target": "self",
      "effects": [
        {
          "op": "block",
          "target": "self",
          "amount": { "const": 6 }
        },
        {
          "op": "add_card",
          "cardId": "status.invoice",
          "destination": "player_discard",
          "temporary": true
        }
      ]
    },
    {
      "id": "stamp_harder",
      "label": "Stamp Harder",
      "target": "front",
      "effects": [
        {
          "op": "damage",
          "target": "intent_target",
          "amount": { "const": 10 },
          "hits": 1,
          "category": "attack"
        }
      ]
    }
  ],
  "ai": {
    "kind": "cycle",
    "moveIds": ["stamp", "paperwork", "stamp_harder"],
    "startIndex": 0
  },
  "traits": [],
  "phases": [],
  "artId": "enemy.claims_adjuster"
}
```

## 8.9 Event schema

Required fields:

```text
schemaVersion
id
title
body
eligibility
choices[]
weight
oncePerRun
followUpPlacement
```

Each choice contains:

```text
id
label
requirements
costs
selections
effects
consequenceSummary
```

Conditions are structured predicates such as:

- `has_flag`.
- `standing_at_least`.
- `has_card_tag`.
- `has_protocol`.
- `has_graft`.
- `can_pay`.
- `act_is`.

No free-form expressions.

### Example event choice

```json
{
  "id": "free_worker",
  "label": "Cut them loose.",
  "requirements": {
    "can_pay": {
      "resource": "front_hp",
      "amount": 6,
      "minimumRemaining": 1
    }
  },
  "costs": [
    {
      "resource": "front_hp",
      "amount": 6
    }
  ],
  "selections": [],
  "effects": [
    {
      "op": "change_standing",
      "factionId": "union",
      "amount": 1
    },
    {
      "op": "set_flag",
      "flagId": "rescued_worker",
      "value": true
    }
  ],
  "consequenceSummary": {
    "immediate": "Lose 6 Front HP. Union Standing +1.",
    "delayed": "Creates an Act 2 follow-up opportunity."
  }
}
```

## 8.10 Runtime state

Keep definitions separate from instances.

### Card instance

```text
instanceId
definitionId
ownerCharacterId
upgradeLevel
origin: permanent | temporary
graftData or null
instanceModifiers
```

### Graft data

```text
leftDefinitionId
rightDefinitionId
chosenIngredient
upgradedDonor: none | left | right
```

### Combat state

```text
turn and phase
actors
frontCharacterId
energy
freeSwapAvailable
hand/draw/discard/exhaust/deployed piles
Imprint
Reaction Recovery used and maximum
selected enemy intents
scheduled effect packets
trigger counters
command sequence
RNG states
```

### Run state

```text
seed
selected characters
difficulty
contract
permanent deck
relics
consumables
Scrap
map
current node
event flags
pending reward
content snapshot/hash
committed transaction IDs
```

### Profile state

```text
Evidence
unlocked content
discovered Reactions
faction Standing
highest cleared Inspection
character unlocks
settings
progression transaction ledger
```

## 8.11 Determinism

Use a pinned, versioned seeded PRNG implementation.

Maintain independent streams for:

- Map generation.
- Encounter selection.
- Combat shuffling.
- Rewards.
- Events.

Cosmetic randomness does not share these streams.

A replay contains:

```text
engine version
content version/hash
initial state
seed and RNG states
ordered player commands
```

The same replay must produce the same final authoritative-state hash across Node, Chromium, Firefox, and WebKit test environments.

Random selection uses stable iteration order. Never depend on filesystem enumeration order.

## 8.12 Trigger ordering and loop safety

Every effect event includes:

```text
eventId
rootCommandId
sourceId
parentEventId
origin: card | reaction | repeat | relic | enemy | consumable
generationDepth
```

Resolve trigger ties by:

1. Declared priority.
2. Stable source ID.
3. Stable trigger ID.

A trigger cannot re-enter itself through its own descendant chain unless its schema explicitly allows a bounded behavior.

All resource-generating triggers require a limit.

All copying triggers require a limit and a no-self-copy rule.

Development safety ceiling: **256 generated events per command**.

Reaching that ceiling is a test failure and a recoverable diagnostic in development—not a secret gameplay nerf that silently deletes effects.

## 8.13 Saving

Save only at atomic boundaries where no immediate rules queue remains unresolved.

Store scheduled future packets as data.

The save envelope includes:

```text
save schema version
engine version
content hash
snapshot
checksum
```

Maintain:

- One active save.
- Two rotating backups.
- JSON export/import.
- A migration test suite.

Use an atomic transaction for progression and run updates so a crash cannot award Evidence twice.

A checksum detects corruption; it is not anti-cheat security.

When a rules migration cannot safely load a save, preserve the original and report the incompatibility. Never silently reinterpret it under incompatible rules.

## 8.14 Bulk-content workflow

An agent adding content must:

1. Generate data using existing schemas and operations.
2. Run structural validation.
3. Run semantic reference validation.
4. Render card/relic text.
5. Generate targeted effect fixtures.
6. Run interaction tests.
7. Produce a content report.
8. Submit the data and evidence together.

A content agent is not allowed to add a custom engine exception because its new item does not fit the architecture.

---

# 9. Technical stack recommendation

## 9.1 Recommended stack

**TypeScript + Vite + React interface + PixiJS 8 presentation layer.**

**The simulation is a separate TypeScript package with no rendering dependency.**

| Responsibility | Choice |
|---|---|
| Language | TypeScript, strict mode |
| Build/development | Vite |
| Interface | React |
| Animated battlefield | PixiJS 8 |
| Content | JSON |
| Validation | JSON Schema + Ajv |
| Unit/integration tests | Vitest |
| Property-based tests | fast-check |
| Browser automation | Playwright |
| Browser persistence | IndexedDB |
| Initial package manager | npm with committed lockfile |
| Desktop later | Electron |
| iOS later | Capacitor, subject to a dedicated mobile milestone |

Vite provides the development/build tooling; PixiJS supplies a sprite-based rendering layer. The application should use those capabilities without allowing either to own combat rules. 

## 9.2 Real engine fork

| Option | Advantages for this project | Disadvantages | Recommendation |
|---|---|---|---|
| **TypeScript + React + PixiJS** | Rules can run directly in a test process; data and code are easy to inspect; web delivery is immediate; rendering can remain replaceable. | Requires deliberate separation between interface and stage; no all-in-one scene editor. | **Choose this.** |
| **Godot + GDScript** | Strong integrated 2D workflow, scene tools, animation tools, and native export path. Godot supports command-line/headless workflows. | More engine-specific project structure; browser exports have their own constraints; a move to a separate simulation package is less natural. | Strong runner-up if animation authoring becomes the dominant concern. |
| **TypeScript + Phaser** | More built-in game-framework behavior and a conventional game scene model. | More framework surface than this turn-based game needs; agents must avoid mixing older and newer framework APIs. | Reasonable alternative, but not necessary here. |

Godot is not being rejected as “untestable”: its official documentation expressly supports headless and command-line workflows. Its web-export documentation also describes platform-specific constraints, including the current limitation on Godot 4 C# web exports. 

Phaser 4 launched in April 2026 according to its official migration overview. A Phaser implementation would need an explicit major-version decision rather than agents casually combining old and new examples. 

## 9.3 Why this is agent-friendly

The recommendation is based on the shape of the work:

- Small text-based modules.
- Explicit data contracts.
- Fast deterministic tests.
- Inspectable command logs.
- Reproducible failures.
- No requirement to manipulate a visual editor to change game rules.

Relative performance of your available coding models on this stack remains unmeasured. The first playable milestones are also a practical evaluation of that assumption.

## 9.4 Rendering boundary

React owns:

- Menus.
- Hand controls.
- Tooltips.
- Reward choices.
- Map controls.
- Accessibility labels.
- Settings.

Pixi owns:

- Character sprites.
- Enemy sprites.
- Battlefield effects.
- Camera movement.
- Visual effect timing.

Neither owns HP, deck order, Energy, or damage calculation.

The renderer consumes:

```text
previous state
next state
presentation events
```

It does not decide what happened.

## 9.5 Testing tools

Vitest supplies the test runner. Playwright supplies browser automation. fast-check supports property-based testing and counterexample generation. These are complementary: scripted browser checks cannot replace rules tests, and random simulations cannot replace authored tactical fixtures. 

## 9.6 Desktop and mobile

Electron is a later packaging adapter, not a second game implementation. Use context isolation, sandboxing, and a narrow validated bridge for the few native functions needed. Electron’s official security guidance specifically addresses those boundaries. 

Capacitor is a possible iOS container for the web application, but iOS remains a separate interface, lifecycle, performance, and release-validation project. Its current documentation uses an Xcode-managed native workflow and WKWebView. Do not treat “runs in a browser” as proof of a finished iOS release. 

## 9.7 Explicit exclusions

Do not add:

- Next.js or server rendering.
- A database server.
- Authentication.
- A general-purpose entity-component framework.
- Online multiplayer.
- A runtime LLM.
- A custom scripting language.
- A custom game editor.
- An analytics backend.

Local structured logs are sufficient for development.

---

# 10. Agent-executable build roadmap

## 10.1 Operating model

The default unit of work is:

> **One agent, one task file, one bounded change, one verifiable result.**

Use your stronger Sol/Astra option for short architectural decisions and difficult reviews. Do not keep an expensive orchestrator continuously rereading routine implementation work.

### Suggested roles

| Role | Default assignment |
|---|---|
| **Implementation worker** | Lowest-cost available coding model that can pass the task’s tests; normal or medium reasoning. |
| **Content worker** | Lower-cost model producing schema-valid data and fixtures. |
| **Reviewer** | Separate session, preferably a different model or at least fresh context. |
| **Architecture consultant** | Your stronger Sol/Astra choice for interfaces, invariants, or repeated failures. |

Configure the actual available model identifiers rather than guessing them from display names.

Codex supports specialized subagents with different configurations, but each subagent performs its own model and tool work. Parallel delegation is not automatically a token-saving technique. 

### Concurrency policy

Maximum normal concurrency:

- **1 implementation writer**.
- **1 independent tests/content worker**.

Use separate worktrees for independent changes. Codex supports worktree-based workflows, but isolation does not eliminate integration work. 

No recursive subagent trees.

No two agents editing the engine contract simultaneously.

### Escalation rules

Consult the stronger model when:

- Two focused repair attempts fail.
- A change requires altering a public engine interface.
- A new content feature cannot be expressed through existing operations.
- A replay becomes nondeterministic.
- Trigger ordering or save compatibility changes.

The consultant should return a decision and bounded repair plan, not restart the project.

## 10.2 Required repository instructions

Keep `AGENTS.md` short and operational. Codex reads project instructions from these files, so they are the right place for the stable development contract—not for copying this entire document into every session. 

Required rules:

```text
The design specification is authoritative.
Do not silently redesign mechanics.
Do not put combat rules in UI or animation code.
Do not special-case content IDs in the engine.
Do not add dependencies without recording the reason.
Do not change unrelated files.
Do not delete failing tests to make the task pass.
Do not regenerate expected results without explaining the rule change.
Do not run large simulations after cosmetic-only changes.
Do not claim a command passed unless it actually ran.
Do not publish, spend money, or change external services without authorization.
End every session with a handoff.
```

## 10.3 Session task format

Each task file contains:

```text
ID
Goal
Dependencies
Relevant design sections
Allowed paths
Forbidden paths
Deliverables
Acceptance commands
Required fixtures
Explicit non-goals
Stop/escalation conditions
```

Each session ends with:

```text
Commit or checkpoint
Files changed
Tests run and results
Known limitations
Any design deviations
Exact next eligible milestone
```

## 10.4 Test cadence

**Every implementation session:** typecheck, affected tests, content validation where relevant.

**Every engine change:** full engine unit suite.

**Playable checkpoints:** replay suite, browser suite, save/load checks, scripted simulations.

**Release gates:** complete automated suite plus human playability and visual review.

Large simulations are not required after every card-text correction or CSS change.

## 10.5 Required command surface

The roadmap establishes these scripts:

```bash
npm run check
npm run test:engine
npm run test:content
npm run test:replay
npm run test:browser
npm run test:properties
npm run simulate -- --seeds 1000
npm run content:report
npm run assets:audit
npm run build
```

These are implementation requirements, not claims that a repository already exists.

---

## 10.6 Core build: M00–M10
### Goal: reach the first playable fight

| ID | Goal and concrete deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M00** | Establish repository, rules documents, task format, scripts, and locked dependencies. | Build configuration and documentation only. | Clean install, typecheck, one unit test, and production build succeed on the documented setup. No game systems yet. | None |
| **M01** | Implement content schemas and validator for cards, relics, enemies, events, and shared effects. | Schema definitions, loader, validation CLI. | Valid fixtures load; fixtures with unknown fields, invalid IDs, missing parameters, and unsupported operations fail with useful paths. | M00 |
| **M02** | Implement authoritative state, versioned RNG streams, command IDs, canonical hashing, and basic event records. | Engine foundation only. | Repeating 100 seeded command sequences produces identical hashes; cosmetic RNG does not affect gameplay RNG. | M01 |
| **M03** | Implement deck cycling, Energy, hand cap, card zones, and turn transitions. | Deck and turn modules. | Tests cover reshuffle, empty draw pile, hand overflow, illegal cost, and card conservation. No card instance exists in two zones. | M02 |
| **M04** | Implement HP, Block, damage packets, and the four target rules. | Damage and targeting modules. | Authored fixtures verify Front redirection, Reserve targeting, Locked persistence, separate Both hits, death, and nonlethal self-cost validation. | M03 |
| **M05** | Implement enemy move cycles and fixed-intent selection. | Enemy controller and intent projection. | Claims Adjuster executes its three moves in order; swapping never changes a Locked target; phase changes cannot rewrite an already selected move. | M04 |
| **M06** | Implement Bleed, Poison, Weak, Exposed, and escalation timing. | Status and phase-boundary modules. | Fixtures verify Poison-before-action, one Bleed tick per multi-hit move, duration expiry, multiplicative rounding, and phase-7 escalation forecasts. | M05 |
| **M07** | Implement Lead/Support classification, manual swaps, Imprint storage, and the four Needle Reactions. | Duo and Reaction core. | Both handoff directions work at Potencies 1–3; Support never Primes; replacing an ingredient resets correctly; extra swaps charge Energy. | M06 |
| **M08** | Implement the remaining 12 Reactions and serializable delayed packets. | Reaction data and scheduler. | All 16 recipes pass independent expected-value fixtures at Potencies 1–3; repeats do not Prime, self-copy, or retarget dead enemies. | M07 |
| **M09** | Implement bounded trigger/modifier dispatch and initial character passives. | Trigger registry and passive data. | Morrow, Switch, and Shared Warranty trigger exactly as specified; trigger order is stable; previews do not consume counters. | M08 |
| **M10** | Build a minimal browser combat screen with starter deck, targets, swaps, End Turn, and restart. | React debug interface; placeholder stage. | A scripted browser test wins a Claims Adjuster fight through real UI controls; its final engine hash matches a headless replay. | M09 |

**Playable checkpoint 1: a real fight with the defining mechanic.**

Do not begin large content production before this checkpoint is enjoyable enough to justify continuing.

---

## 10.7 Complete the combat toolbox: M11–M19
### Goal: one replayable act

| ID | Goal and concrete deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M11** | Implement Exhaust, Retain, Fleeting, Unplayable, Protocol deployment, and additional HP costs. | Keyword lifecycle and cost validation. | Each keyword has play/end-turn/reshuffle fixtures; Protocols do not trigger retroactively; self-costs cannot be avoided by lethal attacks. | M10 |
| **M12** | Add all 12 Source pool cards and upgrades. | Content data and targeted fixtures only, except previously declared missing primitives. | Every card’s base/upgraded outputs match Section 3; all parameter references resolve; no card-ID branches are added. | M11 |
| **M13** | Add all 12 Shaper cards, 4 Crew cards, Invoice, and Fine Print. | Content and fixtures. | The 28-card pool plus junk cards validates; Double Booking, free-swap cards, and Fine Print have boundary tests. | M12 |
| **M14** | Add Shared Warranty and the Anatomy/Circuit relics through Organ Bag and Parallel Port. | First five relic definitions and modifier tests. | Tests verify target-dependent multipliers, per-target Clot limits, healing allowance, and snapshot behavior for Parallel Port. | M13 |
| **M15** | Add the remaining five relics. | Relic data and limited resource/cost triggers. | Refunds, first-Graft discounts, extra reward options, Volt reinforcement, and delayed copies each obey their limits. | M14 |
| **M16** | Implement the three family transformations. | Family counting and transformation triggers. | Three distinct family relics activate exactly once; duplicates do not count; transformation effects obey origin and repeat restrictions. | M15 |
| **M17** | Add the five initial enemies, initial encounter formations, and Head of Recovery. | Enemy/encounter data and phase fixtures. | Every move cycle and boss threshold has an authored trace; dead enemies never act; the first encounter cannot roll a two-enemy formation. | M16 |
| **M18** | Implement Scrap, card rewards, rarity selection, relic rewards, and eligible-pool filtering. | Reward engine and basic choice UI. | Offers satisfy role guarantees, rarity normalization, and uniqueness; skip works; reward claims are idempotent across repeated commands. | M17 |
| **M19** | Assemble a fixed seven-node test act with combat, rewards, healing, elite, and boss. | Minimal run-state transitions. | A browser script and headless script can complete the act; HP and deck changes persist between fights while combat-only state resets. | M18 |

**Playable checkpoint 2: one act that can be played repeatedly with different rewards.**

This is the first serious pacing and fun test.

---

## 10.8 Build the complete run: M20–M32

| ID | Goal and concrete deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M20** | Implement versioned snapshot serialization, checksums, content snapshots, and JSON export/import. | Pure save encoding and migration contracts. | Save→load preserves state and replay hash, including pending rewards, Grafts’ future schema, trigger counters, and delayed packets. Corrupt saves are rejected without deletion. | M19 |
| **M21** | Add IndexedDB persistence, two backups, and atomic run/profile commits. | Browser persistence adapter. | Fault-injection tests interrupt writes at each transaction boundary; the game recovers a valid generation and never duplicates a reward. | M20 |
| **M22** | Implement the branching two-act map template and generator constraints. | Map generator and map UI. | 1,000 seeds produce reachable bosses, valid links, legal node placements, and no consecutive duplicate encounter. | M21 |
| **M23** | Implement shop stock, purchases, removal pricing, consumables, and purchase persistence. | Economy commands and service UI. | Double-click and reload cannot duplicate purchases; stock never rerolls; consumable capacity and one-per-turn limits are enforced. | M22 |
| **M24** | Implement the Graft compiler and eligibility rules. | Content composition and runtime Graft representation. | Exhaustive donor-pair validation rejects illegal pairs; valid Grafts preserve effect order, cost sum, one ingredient, and one card-play event. | M23 |
| **M25** | Implement Graft selection, preview, naming, and donor-specific upgrading. | Workshop UI and Graft upgrade command. | A UI test creates, saves, reloads, plays, and upgrades a Graft; preview and actual effects match. It cannot be Grafted again. | M24 |
| **M26** | Complete rest and Workshop services. | Service transactions and upgrade targeting. | Healing caps at maximum HP; all costs escalate correctly; invalid upgrades are unavailable; Inspection pricing hooks have tests. | M25 |
| **M27** | Implement event predicates, costs, selections, flags, Standing, and follow-up scheduling. | Narrative rules interpreter. | Fixture events exercise each predicate; unavailable costs cannot be paid; follow-ups place deterministically without breaking the map. | M26 |
| **M28** | Add the 12 specified events and three starting contracts. | Data, text, and choice fixtures. | Every choice has expected immediate and delayed consequences; no event exceeds its text/choice budget; event acquisitions can bypass normal pool unlocks only where specified. | M27 |
| **M29** | Implement the Break Room, Evidence ledger, four unlock packs, discovery tracking, and Test Bench access. | Profile progression and hub UI. | Unlock costs and prerequisites work; old discoveries pay nothing; death retains committed Evidence; testing mode grants no progression. | M28 |
| **M30** | Implement Inspection levels 0–10. | Difficulty modifier data and unlock logic. | Each modifier works independently and cumulatively; forecasts include modified values; level unlocks require the correct victory condition. | M29 |
| **M31** | Add Act 2 enemies, elite variants, and Acting Body. | Content plus final-boss trait data. | Authored traces verify Joint Account, phase thresholds, Invoice changes, and attack values; no new content-ID special cases exist. | M30 |
| **M32** | Integrate the complete 14-node run and ending flow. | Run orchestration and end-state handling. | Seeded UI tests cover victory, defeat, quit/resume, event follow-up, and final reward commitment; no combat state leaks between encounters. | M31 |

**Playable checkpoint 3: a complete two-act game.**

At this point, stop adding systems. The next work establishes whether the existing game is readable, robust, and worth expanding.

---

## 10.9 Make it a dependable compact release: M33–M42

| ID | Goal and concrete deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M33** | Add local pacing logs and simple random/greedy simulation policies. | Development tools, not runtime services. | Simulations export turn counts, damage taken, choices, deck size, and termination reasons; no invalid commands or stalled runs across 1,000 seeds. | M32 |
| **M34** | Add a Reaction-aware policy and authored build benchmarks. | Simulation policy and benchmark fixtures. | At least 8 benchmark encounters compare attack-only, defense-aware, and Reaction-aware behavior; reports distinguish policy weakness from engine failure. | M33 |
| **M35** | Add Pixi stage adapter and standardized placeholder/final sprite atlas handling. | Presentation boundary and asset loader. | A full run renders with missing-asset fallbacks; stage teardown/restart leaks no listeners; changing the renderer does not change replay hashes. | M34 |
| **M36** | Implement swap, hit, Reaction, death, and speed-control animation timelines. | Presentation events only. | 1×, 1.5×, 2×, skipped animation, and reduced-motion runs all produce identical authoritative states. | M35 |
| **M37** | Add the audio manager, 18 SFX slots, music stems, volume settings, and mute behavior. | Audio adapter and asset validation. | Missing audio cannot block play; mute and pause/resume do not change state; audio files pass format and clipping checks. | M36 |
| **M38** | Implement full card previews, intent forecasts, encyclopedia discovery, and three contextual tutorials. | UI projections and information redaction. | Preview equals committed outcomes for visible effects; unknown draw identities never appear; tutorial prompts fire once and remain disabled after dismissal. | M37 |
| **M39** | Complete keyboard/touch controls, focus handling, text scaling, contrast cues, and motion/gore settings. | Input and accessibility layer. | All core screens work without dragging or hover; focus never traps the user; automated viewport checks find no clipped actionable controls at supported desktop sizes. | M38 |
| **M40** | Add interaction properties, pair/triple relic tests, malformed-content tests, and independent regression fixtures. | Test infrastructure and bug repair only. | All 16 recipes, both handoff directions, Potencies 1–3, legal Grafts, and sampled relic combinations terminate deterministically; deliberate rule mutations are caught. | M39 |
| **M41** | Perform one bounded balance pass using benchmark reports and human play observations. | Numerical data changes only unless a confirmed bug requires repair. | Changes include before/after reports; no unrecorded rules changes; ordinary-fight and winning-run pacing targets are assessed honestly, not inferred from bot speed. | M40 |
| **M42** | Produce the compact-v1 release candidate, export bundle, release notes, and recovery instructions. | Release configuration and final verification. | Full automated suite passes; cold start, offline-after-load, save recovery, and complete runs work in Chromium, Firefox, and WebKit tests; human playability/visual review is recorded separately. | M41 |

**Playable checkpoint 4: compact v1.**

Its fixed content budget is:

| Content | Count |
|---|---:|
| Playable duo | 1 |
| Draftable cards | 28 |
| Starter definitions | 6 |
| Junk/status definitions | 2 |
| Reactions | 16 |
| Relics, including starter | 10 |
| Transformations | 3 |
| Non-boss enemy definitions | 8 |
| Bosses | 2 |
| Events | 12 |
| Factions | 3 |
| Starting contracts | 3 |
| Inspection levels above baseline | 10 |

This is a compact foundation, not a claim that ten relics already deliver the long-tail content density you ultimately want.

---

## 10.10 Expand to nine pairings: M43–M55

### Shared character-batch acceptance contract

A four-card character batch must include:

- Four complete cards with base and upgraded values.
- Schema-valid character ownership.
- At least two interaction fixtures per card.
- No new engine operation unless separately approved.
- A text report explaining each card’s role and overlap with the existing pool.

Each new character receives eight signature cards across two sessions.

| ID | Goal and deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M43** | Generalize character selection, role pools, starter substitutions, and character unlock definitions. | Character configuration and selection UI. | Morrow/Switch behavior remains unchanged; invalid Source/Source and Shaper/Shaper pairings are rejected. | M42 |
| **M44** | Add Kiln, Arc Test, passive, and first 4 signature cards. | Character data and Volt/Gore content. | Character stats match Section 4; four-card batch contract passes; Kiln can complete the first encounter. | M43 |
| **M45** | Add Kiln’s remaining 4 signature cards. | Content only. | Eight-card signature pool validates; fixtures cover reinforcement, immediate damage, and a defensive alternative. | M44 |
| **M46** | Add Mercy, Billing Cycle, passive, and first 4 signature cards. | Character data and Siphon/Needle content. | Recovery allowance stacks correctly with Organ Bag; four-card batch contract passes. | M45 |
| **M47** | Add Mercy’s remaining 4 signature cards. | Content only. | No healing loop exceeds declared budgets; eight-card signature pool validates. | M46 |
| **M48** | Verify the first four pairings. | Integration and balancing fixtures. | Morrow/Kiln × Switch/Mercy can start, save, resume, and complete authored benchmark routes; no pairing-specific engine branches exist. | M47 |
| **M49** | Add Null, Bad Memory, passive, and first 4 signature cards. | Character data and Echo/Rot content. | Multihit and Reserve-Block fixtures pass; no repeated packet counts as a new primary Reaction. | M48 |
| **M50** | Add Null’s remaining 4 signature cards. | Content only. | Eight-card signature pool validates with both aggressive and attrition interactions. | M49 |
| **M51** | Add Penny, Tomorrow’s Problem, passive, and first 4 signature cards. | Character data and Loop/Burst content. | Scheduled batches grant at most 1 Energy per player turn, after refill and before player actions. | M50 |
| **M52** | Add Penny’s remaining 4 signature cards. | Content only. | Delayed-effect snapshots survive save/load; eight-card signature pool validates. | M51 |
| **M53** | Add 4 additional Morrow signature cards. | Gore/Rot character content. | Morrow reaches eight signature cards; new cards do not merely replace existing cards with larger numbers. | M52 |
| **M54** | Add 4 additional Switch signature cards. | Needle/Burst character content. | Switch reaches eight signature cards; shared pool references remain correct. | M53 |
| **M55** | Complete nine-pairing regression, selection presentation, and unlock integration. | Integration and data tuning. | All nine pairings pass start/save/resume/replay and benchmark-route tests; reports identify balance outliers without pretending the pairings are already equally strong. | M54 |

At M55, the global draft pool contains **68 cards**.

---

## 10.11 Expand card breadth: M56–M62

These are **seven separate sessions**, not one request to generate 28 cards.

Each session adds exactly four cards using the shared character-batch acceptance contract, except the cards enter shared role pools.

For each batch, use an initial rarity distribution of:

```text
1 Common
2 Uncommon
1 Rare
```

| ID | Goal and deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M56** | Add 4 shared Source cards exploring Volt/Gore interactions. | Data and fixtures. | Batch contract passes; at least one card is defensively useful. | M55 |
| **M57** | Add 4 shared Source cards exploring Rot/Echo interactions. | Data and fixtures. | Batch contract passes; no card is simply a superior existing Poison applicator. | M56 |
| **M58** | Add 4 shared Shaper cards for Needle/Burst tradeoffs. | Data and fixtures. | Single-target and multi-target benchmarks demonstrate distinct uses. | M57 |
| **M59** | Add 4 shared Shaper cards for Siphon/Loop tradeoffs. | Data and fixtures. | Recovery and delayed-output limits hold under all existing relics. | M58 |
| **M60** | Add 4 Crew cards for defense and card flow. | Data and fixtures. | At least two are useful without a specific ingredient family; no zero-cost draw cycle is introduced. | M59 |
| **M61** | Add 4 Crew cards interacting with Grafts. | Data and fixtures. | Cards reward Grafting without creating extra Imprints or allowing recursive Grafts. | M60 |
| **M62** | Add 4 Crew cards for hand management and status interactions. | Data and fixtures. | Each supports at least two materially different builds; full card report reaches 96 draftable definitions. | M61 |

After M62:

- Shared Source cards: **16**.
- Shared Shaper cards: **16**.
- Crew cards: **16**.
- Six characters × eight signature cards: **48**.
- **Global total: 96 draftable cards.**
- **Ordinary eligible pool for a selected pairing: 64 cards**, before unlock filtering.

---

## 10.12 Expand relic density: M63–M72

### Shared relic-batch acceptance contract

Each session adds **five relics**.

Every relic must:

- Use existing operations and modifier channels.
- Have exact limits where it generates resources or copies.
- Interact usefully with at least three cards and two Reactions.
- Include positive, boundary, and non-trigger fixtures.
- Pass pair testing with every existing relic.
- Pass sampled triple-combination testing.
- Add no unexplained automatic immunity or arbitrary card-ID dependency.

| ID | Goal and deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M63** | Add 1 Anatomy, 1 Circuit, 1 Forgery, 2 neutral relics. | Data and tests. | Five-relic batch contract passes. | M62 |
| **M64** | Add the same family distribution, emphasizing defensive conversions. | Data and tests. | Five-relic contract passes; sustain remains bounded. | M63 |
| **M65** | Add the same distribution, emphasizing multi-hit and packet structure. | Data and tests. | Per-hit versus per-Reaction behavior is explicitly tested. | M64 |
| **M66** | Add the same distribution, emphasizing hand and discard interactions. | Data and tests. | No draw/refund cycle can repeat without spending a bounded resource. | M65 |
| **M67** | Add the same distribution, emphasizing status conversions. | Data and tests. | Status conversion cannot recursively retrigger itself. | M66 |
| **M68** | Add the same distribution, emphasizing risky tradeoffs. | Data and tests. | Every drawback is visible before acquisition and represented in forecasts. | M67 |
| **M69** | Add 2 Anatomy, 2 Circuit, 1 Forgery relic. | Data and tests. | Five-relic contract passes; interaction graph identifies no isolated item. | M68 |
| **M70** | Add 2 Anatomy, 2 Circuit, 1 Forgery relic. | Data and tests. | Resource-generation limits remain valid with every earlier refund item. | M69 |
| **M71** | Add 1 Anatomy, 1 Circuit, 2 Forgery, 1 neutral relic. | Data and tests. | Graft/copy combinations pass origin and recursion tests. | M70 |
| **M72** | Add 1 Anatomy, 1 Circuit, 2 Forgery, 1 neutral relic. | Data and tests. | Global relic count reaches 60 including Shared Warranty; full interaction report is generated. | M71 |

Final relic distribution:

- Anatomy: **15**.
- Circuit: **15**.
- Forgery: **15**.
- Neutral non-starter: **14**.
- Shared Warranty: **1**.

## 10.13 Expand encounter variety: M73–M84

### Enemy batch contract

Each two-enemy batch requires:

- Exact HP and move values.
- A complete visible move cycle.
- A distinct tactical question.
- Three encounter placements.
- Status, targeting, death-order, and escalation fixtures.
- No new mechanic merely to justify the enemy’s existence.

| ID | Goal and deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M73** | Add 2 Act 1 enemies focused on Front/Reserve decisions. | Enemy and encounter data. | Enemy batch contract passes; neither appears in the first fight without a suitability test. | M72 |
| **M74** | Add 2 enemies focused on Block and attrition. | Data and fixtures. | Poison, Bleed, and direct builds each have viable responses. | M73 |
| **M75** | Add 2 enemies focused on kill order. | Data and fixtures. | Simultaneous and sequential deaths resolve consistently. | M74 |
| **M76** | Add 2 enemies focused on intent timing and preparation. | Data and fixtures. | Their threat is fully represented before the player commits. | M75 |
| **M77** | Add 2 Act 2 enemies focused on mixed targeting. | Data and fixtures. | Both-target and Locked combinations stay within declared encounter budgets. | M76 |
| **M78** | Add 2 elite-capable enemies and their formations. | Data and fixtures. | Global non-boss enemy count reaches 20; each elite has an authored winning benchmark. | M77 |
| **M79** | Add a second Act 1 boss. | One boss, maximum 2 phases and 4 moves per phase. | Phase and targeting traces pass; at least 4 different benchmark builds can win without damage-type immunity exceptions. | M78 |
| **M80** | Add a third Act 1 boss. | One boss and encounter selection. | Same boss contract passes; Act 1 boss selection remains deterministic and saved. | M79 |
| **M81** | Add a second Act 2 boss. | One boss and fixtures. | Same boss contract passes; delayed packets and transformations remain valid. | M80 |
| **M82** | Add a third Act 2 boss. | One boss and fixtures. | Global boss count reaches 6; each act has 3 eligible bosses. | M81 |
| **M83** | Add 6 events, including 3 delayed follow-ups. | Narrative data and placement tests. | Every consequence is testable; no follow-up can strand the map or require an unavailable item. | M82 |
| **M84** | Add 6 more events emphasizing cross-faction and build-dependent choices. | Narrative data and fixtures. | Global event count reaches 24; repeated-run text and eligibility reports pass. | M83 |

## 10.14 Full-content integration and optional ports: M85–M89

| ID | Goal and deliverables | Technical scope | Done when | Dependencies |
|---|---|---|---|---|
| **M85** | Integrate the full 3×3 roster and expanded content into a new release candidate. | Unlock allocation, reward weights, regression, numerical tuning. | All nine pairings, 96 cards, 60 relics, 20 enemies, 6 bosses, and 24 events validate; no inaccessible or orphaned content remains; complete benchmark report is recorded. | M84 |
| **M86** | Package the existing game as an Electron desktop application. | Desktop adapter, secure bridge, local saves. | Offline launch and complete-run smoke tests pass on Windows and macOS; renderer has no unrestricted Node access; web and desktop replays match. | M85 |
| **M87** | Add controller navigation and desktop release preparation. | Input adapter, store-facing build metadata, packaging scripts. | Every core screen works with controller input; save paths and update behavior are documented; unsigned/signed status is reported honestly. | M86 |
| **M88** | Build the dedicated compact/mobile layout. | Responsive UI and touch behavior. | Tests at 852×393 and 844×390 landscape sizes show reachable controls, readable expanded card details, safe-area handling, and no hover dependency. | M85 |
| **M89** | Build and verify the Capacitor iOS shell. | Native wrapper, suspend/resume, storage, audio lifecycle. | Simulator and physical-device checks confirm full-run play, suspension recovery, save persistence, and performance. Missing Xcode/signing/device prerequisites remain explicit blockers, not a false “done.” | M88 |

Desktop and mobile work are optional release branches. They do not require delaying a browser release that is already worth playing.

## 10.15 What agents can and cannot verify

| Question | Suitable verification |
|---|---|
| Did the damage resolve correctly? | Exact unit fixture |
| Can a combination recurse forever? | Trigger ancestry tests, property tests, bounded simulations |
| Does a save reload correctly? | State/hash comparison and fault injection |
| Can the map generate an impossible route? | Generator properties over many seeds |
| Can the user complete a flow? | Browser automation |
| Does the pixel art look coherent? | Asset checks plus human visual judgment |
| Is a boss enjoyable? | Human playtesting supported by local metrics |
| Is the game sufficiently varied after 30 runs? | Repeated human play and content-usage analysis |
| Is the game commercially ready? | Not established by a green test suite alone |

A test suite can prove that the machine behaves as specified. It cannot prove that the specification is worth playing.

---

# 11. Risks, unresolved validation points, and decision rules

These are **variables to validate**, not another question round.

## 11.1 The handoff could become automatic

**Risk:** Every turn becomes “play ingredient, swap, play ingredient,” with no meaningful variation.

**Detection:** Across recorded play, the same opening pattern dominates regardless of enemies, HP, or hand composition.

**Response:** First tune enemy targeting, ingredient replacement costs, defensive opportunities, and Potency incentives. Do not immediately add another resource bar.

The handoff should be common. The *timing and shape of the handoff* should not be solved in advance.

## 11.2 Two HP bars could feel punitive

**Risk:** A player with substantial total HP loses because one character is repeatedly targeted.

**Existing protections:** Support cards remain playable; one free swap per turn; explicit Locked targeting; healing selection; no hidden move changes.

**Response:** Reduce unavoidable Reserve/Both damage before adding revives or a wounded-character subsystem.

## 11.3 Multipliers could flatten boss fights

**Risk:** A small number of interactions trivialize too many encounters.

**Policy:** Occasional spectacular wins are desirable. Repeatable infinite turns, infinite healing, and guaranteed low-investment boss deletion are not.

**Response:** Adjust trigger limits, setup requirements, and opportunity costs. Avoid blanket boss immunities or invisible damage caps.

## 11.4 Grafting could become mandatory

**Risk:** Every correct run simply compresses the deck as much as possible.

**Existing controls:** No automatic Energy discount, limited Workshop access, escalating price, restricted donor operations, maximum two donors, one upgrade.

**Response:** Compare Graft purchase value against card removal, relic acquisition, and healing. Adjust the economic decision before weakening the underlying satisfaction of combining cards.

## 11.5 The initial relic pool is deliberately small

Ten relics can prove the architecture, but they cannot sustain the intended long tail alone.

That is why the roadmap expands the relic pool in controlled five-item sessions after the base game is reliable.

The expansion priority should be:

> **More meaningful interactions before more unrelated systems.**

## 11.6 Unlocks could dilute the pool

**Risk:** Unlocking content makes a preferred strategy harder to find.

**Controls:** Selected-character pools, role-aware rewards, signature weighting, and no unselected-character exclusives in ordinary rewards.

**Response:** Track offered and selected content by category. Do not solve dilution by secretly guaranteeing a complete archetype.

## 11.7 Numerical tests could become self-fulfilling

**Risk:** An agent computes expected results using the same incorrect function being tested.

**Controls:**

- Hand-authored fixtures based on the tables in this document.
- Independent arithmetic/reference implementations for critical calculations.
- Mutation tests that intentionally break rounding, targeting, or trigger limits.
- Reviewer checks of the test’s assumptions, not only whether it passes.

## 11.8 AI-generated content could become repetitive

**Risk:** Hundreds of cards with different names but the same decision.

**Controls:** Interaction requirements, role reports, overlap checks, and small batches.

A rejected batch is cheaper than permanently supporting 20 redundant cards.

## 11.9 Pixel animation could consume the project

**Risk:** The project spends more effort repairing inconsistent frames than improving combat.

**Controls:** Stable silhouettes, fixed palettes, consistent anchors, reusable effect animation, and simple motion until the loop is proven.

**Response:** Keep the best static asset and improve presentation around it rather than regenerating the entire character repeatedly.

## 11.10 Browser technology could drift toward a website aesthetic

**Risk:** The game acquires dashboard panels, generic cards, and menu sprawl.

**Controls:** A single game-focused composition, fixed visual hierarchy, animated stage, tactile card motion, clear typography, and restrained interface chrome.

The technology does not determine whether the result feels like a game. The composition and interaction design do.

## 11.11 Agent sessions are not guaranteed production units

The milestones are intentionally bounded, but a difficult defect may require a separate repair session.

Do not respond by enlarging the next prompt into “finish everything.”

Record the blocker, isolate it, and keep the next task smaller.

Likewise, a desire to make progress throughout a ten-hour day should not be converted into an assumption of ten uninterrupted hours of high-model availability. Budget around completed tasks and measured usage.

## 11.12 Working title and commercial clearance

*Joint Liability* is a working title, not a verified claim of naming availability or exclusive mechanical originality.

Before a commercial release, perform separate title, asset, music, licensing, storefront, and platform reviews.

Those reviews are not prerequisites for building the first enjoyable fight.

## 11.13 Definition of success

The concept succeeds when the player can say:

> “I switched because she was about to die. That preserved the wrong ingredient. Then I realized the wrong ingredient was exactly what this relic needed.”

That is the game’s identity: **tactical necessity turning into an invention the player feels they discovered.**

The build order protects that identity:

**Prove the handoff. Complete one run. Make the rules dependable. Then expand the combinatorial space.**