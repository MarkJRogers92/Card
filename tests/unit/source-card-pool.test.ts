import { beforeAll, describe, expect, it } from "vitest";
import {
  assertCardConservation,
  beginPlayerTurn,
  cardLifecycleSpecFor,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  createImprint,
  endPlayerTurnWithCardLifecycle,
  getStatusAmount,
  initializeCombatActors,
  playContentCard,
  setCombatStatusForTesting,
  startCombat,
  type AuthoritativeState,
  type CardInstance,
  type CardLifecycleSpec,
  type Ingredient,
} from "../../src/engine";
import { loadRegistry } from "../../src/content/registry.mjs";
import type { CardDefinition } from "../../src/content/generated";

const SOURCE_ACTOR = "duo.source";
const SHAPER_ACTOR = "duo.shaper";
const ENEMY_ACTOR = "enemy.target";

const SOURCE_CARD_IDS = [
  "source.open_wound",
  "source.spoiled_sample",
  "source.bone_saw",
  "source.ground_fault",
  "source.double_take",
  "source.blood_bank",
  "source.surgical_tape",
  "source.controlled_decay",
  "source.tenderize",
  "source.emergency_rebuild",
  "source.thick_skin",
  "source.unlicensed_procedure",
] as const;

const MORROW_SIGNATURE_IDS = new Set([
  "source.open_wound",
  "source.bone_saw",
  "source.thick_skin",
  "source.unlicensed_procedure",
]);

let definitions: Map<string, CardDefinition>;

beforeAll(async () => {
  const registry = await loadRegistry([], { rootDir: process.cwd() });
  definitions = new Map();
  for (const file of registry.definitions) {
    if (file.kind === "card") {
      const data = file.data as CardDefinition;
      definitions.set(data.id, data);
    }
  }
});

function requireDefinition(id: string): CardDefinition {
  const found = definitions.get(id);
  if (found === undefined) {
    throw new Error(`Missing loaded card definition: ${id}.`);
  }
  return found;
}

let nextOrdinal = 1;
function sourceCard(id: string, owner: string = SOURCE_ACTOR): CardInstance {
  const instance = createCardInstance({
    instanceId: createCardInstanceId(nextOrdinal),
    definitionId: id,
    ownerCharacterId: owner,
  });
  nextOrdinal += 1;
  return instance;
}

interface EnemySetup {
  readonly actorId: string;
  readonly maxHp: number;
  readonly hp?: number;
  readonly block?: number;
}

interface CombatSetup {
  readonly cards: readonly CardInstance[];
  readonly sourceMaxHp?: number;
  readonly sourceHp?: number;
  readonly frontActorId?: string;
  readonly enemies?: readonly EnemySetup[];
  readonly energyPerTurn?: number;
  readonly storedImprint?: Ingredient;
}

function createCombat(setup: CombatSetup): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 4242,
      contentVersion: "m12.test",
      contentHash: "m12-source-card-pool-test",
    }),
    setup.cards,
    {
      cardsPerTurn: setup.cards.length,
      maxHandSize: Math.max(10, setup.cards.length),
      energyPerTurn: setup.energyPerTurn ?? 20,
    },
  );
  const enemies = setup.enemies ?? [{ actorId: ENEMY_ACTOR, maxHp: 100 }];
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: SOURCE_ACTOR, maxHp: setup.sourceMaxHp ?? 44, hp: setup.sourceHp },
      { actorId: SHAPER_ACTOR, maxHp: 36 },
    ],
    enemies: enemies.map((enemy) => ({
      actorId: enemy.actorId,
      maxHp: enemy.maxHp,
      hp: enemy.hp,
      block: enemy.block,
    })),
    frontCharacterId: setup.frontActorId ?? SOURCE_ACTOR,
  });
  state = beginPlayerTurn(state);

  if (setup.storedImprint !== undefined) {
    const combat = state.combat;
    if (combat === null) {
      throw new Error("Expected combat.");
    }
    state = {
      ...state,
      combat: {
        ...combat,
        imprint: createImprint(SHAPER_ACTOR, setup.storedImprint),
      },
    };
  }

  return state;
}

function play(
  state: AuthoritativeState,
  instance: CardInstance,
  options: { readonly upgraded?: boolean; readonly target?: string; readonly owner?: string } = {},
) {
  return playContentCard(state, {
    instanceId: instance.instanceId,
    definition: requireDefinition(instance.definitionId),
    upgraded: options.upgraded ?? false,
    ownerCharacterId: options.owner ?? instance.ownerCharacterId,
    selectedEnemyActorId: options.target ?? null,
  });
}

function actorOf(state: AuthoritativeState, actorId: string) {
  const found = state.combat?.actors[actorId];
  if (found === undefined) {
    throw new Error(`Missing actor ${actorId}.`);
  }
  return found;
}

function deckOf(state: AuthoritativeState) {
  const deck = state.combat?.deck;
  if (deck === undefined) {
    throw new Error("Expected deck.");
  }
  return deck;
}

describe("M12 Source card pool production content", () => {
  it("validates cleanly against the content schema and registry", async () => {
    const registry = await loadRegistry([], { rootDir: process.cwd() });

    expect(registry.status).toBe("valid");
    expect(registry.diagnostics).toEqual([]);
    expect(registry.counts.card.invalid).toBe(0);
    expect(registry.counts.card.total).toBeGreaterThanOrEqual(SOURCE_CARD_IDS.length);
    for (const id of SOURCE_CARD_IDS) {
      expect(definitions.has(id)).toBe(true);
    }
  });

  it("marks exactly the four designed Morrow signature cards and leaves the rest unlocked-by-default", () => {
    for (const id of SOURCE_CARD_IDS) {
      const definition = requireDefinition(id);
      expect(definition.owner).toBe("source");
      if (MORROW_SIGNATURE_IDS.has(id)) {
        expect(MORROW_SIGNATURE_IDS.has(id)).toBe(true);
      }
    }
    expect(MORROW_SIGNATURE_IDS.size).toBe(4);
  });
});

describe("Open Wound", () => {
  it("deals 7 damage and applies 2 Bleed at base", () => {
    const card = sourceCard("source.open_wound");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    expect(enemy.hp).toBe(93);
    expect(getStatusAmount(enemy.statuses, "bleed")).toBe(2);
  });

  it("deals 10 damage and applies 3 Bleed when upgraded", () => {
    const card = sourceCard("source.open_wound");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    expect(enemy.hp).toBe(90);
    expect(getStatusAmount(enemy.statuses, "bleed")).toBe(3);
  });
});

describe("Spoiled Sample", () => {
  it("deals 4 damage and applies 3 Poison at base", () => {
    const card = sourceCard("source.spoiled_sample");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    expect(enemy.hp).toBe(96);
    expect(getStatusAmount(enemy.statuses, "poison")).toBe(3);
  });

  it("deals 6 damage and applies 4 Poison when upgraded", () => {
    const card = sourceCard("source.spoiled_sample");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    expect(enemy.hp).toBe(94);
    expect(getStatusAmount(enemy.statuses, "poison")).toBe(4);
  });
});

describe("Bone Saw", () => {
  it("deals 4 damage three times at base", () => {
    const card = sourceCard("source.bone_saw");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(88);
  });

  it("deals 5 damage three times when upgraded", () => {
    const card = sourceCard("source.bone_saw");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(85);
  });

  it("resolves as three independent attack hits, not one combined packet (Strength applies per hit)", () => {
    const card = sourceCard("source.bone_saw");
    let state = createCombat({ cards: [card] });
    state = setCombatStatusForTesting(state, SOURCE_ACTOR, "strength", 5);

    const result = play(state, card, { target: ENEMY_ACTOR });

    // Three independent hits of (4 + 5 Strength) = 27 total.
    // A single combined 12-damage packet with Strength applied once would be 15.
    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(73);
  });
});

describe("Ground Fault", () => {
  it("deals 8 damage at base", () => {
    const card = sourceCard("source.ground_fault");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(92);
  });

  it("deals 11 damage when upgraded", () => {
    const card = sourceCard("source.ground_fault");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(89);
  });
});

describe("Double Take", () => {
  it("deals 4 damage twice at base", () => {
    const card = sourceCard("source.double_take");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(92);
  });

  it("deals 5 damage twice when upgraded", () => {
    const card = sourceCard("source.double_take");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(90);
  });

  it("resolves as two independent attack hits, not one combined packet (Strength applies per hit)", () => {
    const card = sourceCard("source.double_take");
    let state = createCombat({ cards: [card] });
    state = setCombatStatusForTesting(state, SOURCE_ACTOR, "strength", 5);

    const result = play(state, card, { target: ENEMY_ACTOR });

    // Two independent hits of (4 + 5 Strength) = 18 total, not floor((4*2) + 5) = 13.
    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(82);
  });
});

describe("Blood Bank", () => {
  it("pays 3 owner HP, gains 1 Energy, and Exhausts at base", () => {
    const card = sourceCard("source.blood_bank");
    const state = createCombat({ cards: [card], energyPerTurn: 3 });

    const result = play(state, card);

    expect(actorOf(result.state, SOURCE_ACTOR).hp).toBe(41);
    expect(result.state.combat?.energy).toBe(4);
    expect(result.state.combat?.deck.zones.exhaust).toContain(card.instanceId);
    expect(result.state.combat?.deck.zones.discard).not.toContain(card.instanceId);
  });

  it("pays only 2 owner HP when upgraded", () => {
    const card = sourceCard("source.blood_bank");
    const state = createCombat({ cards: [card], energyPerTurn: 3 });

    const result = play(state, card, { upgraded: true });

    expect(actorOf(result.state, SOURCE_ACTOR).hp).toBe(42);
    expect(result.state.combat?.energy).toBe(4);
  });
});

describe("Surgical Tape", () => {
  it("grants the owner 8 Block at base", () => {
    const card = sourceCard("source.surgical_tape");
    const state = createCombat({ cards: [card] });

    const result = play(state, card);

    expect(actorOf(result.state, SOURCE_ACTOR).block).toBe(8);
  });

  it("grants the owner 11 Block when upgraded", () => {
    const card = sourceCard("source.surgical_tape");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { upgraded: true });

    expect(actorOf(result.state, SOURCE_ACTOR).block).toBe(11);
  });

  it("stays in hand at player-turn end via Retain when left unplayed", () => {
    const card = sourceCard("source.surgical_tape");
    const state = createCombat({ cards: [card] });
    const lifecycle: CardLifecycleSpec = {
      category: "skill",
      keywords: ["retain"],
      additionalHpCosts: [],
    };

    const ended = endPlayerTurnWithCardLifecycle(state, () => lifecycle);

    expect(ended.combat?.deck.zones.hand).toEqual([card.instanceId]);
    expect(ended.combat?.deck.zones.discard).toEqual([]);
  });
});

describe("Controlled Decay", () => {
  it("applies 5 Poison at base", () => {
    const card = sourceCard("source.controlled_decay");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    expect(getStatusAmount(enemy.statuses, "poison")).toBe(5);
    expect(enemy.hp).toBe(100);
  });

  it("applies 7 Poison when upgraded", () => {
    const card = sourceCard("source.controlled_decay");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });

    expect(getStatusAmount(actorOf(result.state, ENEMY_ACTOR).statuses, "poison")).toBe(7);
  });
});

describe("Tenderize", () => {
  it("deals 5 damage then applies 1 Exposed at base, without the new Exposed boosting its own damage", () => {
    const card = sourceCard("source.tenderize");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    // If Exposed applied before damage, this would be floor(5 * 1.5) = 7 instead of 5.
    expect(enemy.hp).toBe(95);
    expect(getStatusAmount(enemy.statuses, "exposed")).toBe(1);
  });

  it("deals 7 damage then applies 2 Exposed when upgraded", () => {
    const card = sourceCard("source.tenderize");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    expect(enemy.hp).toBe(93);
    expect(getStatusAmount(enemy.statuses, "exposed")).toBe(2);
  });
});

describe("Emergency Rebuild", () => {
  it("heals the owner for 7 and Exhausts at base", () => {
    const card = sourceCard("source.emergency_rebuild");
    const state = createCombat({ cards: [card], sourceHp: 20 });

    const result = play(state, card);

    expect(actorOf(result.state, SOURCE_ACTOR).hp).toBe(27);
    expect(result.state.combat?.deck.zones.exhaust).toContain(card.instanceId);
  });

  it("heals the owner for 10 when upgraded", () => {
    const card = sourceCard("source.emergency_rebuild");
    const state = createCombat({ cards: [card], sourceHp: 20 });

    const result = play(state, card, { upgraded: true });

    expect(actorOf(result.state, SOURCE_ACTOR).hp).toBe(30);
  });

  it("caps healing at the owner's maximum HP instead of overshooting", () => {
    const card = sourceCard("source.emergency_rebuild");
    const state = createCombat({ cards: [card], sourceMaxHp: 44, sourceHp: 40 });

    const result = play(state, card);

    expect(actorOf(result.state, SOURCE_ACTOR).hp).toBe(44);
  });
});

describe("Thick Skin", () => {
  it("moves to the deployed zone and installs exactly one Protocol trigger binding", () => {
    const card = sourceCard("source.thick_skin");
    const state = createCombat({ cards: [card] });

    const result = play(state, card);

    expect(result.state.combat?.deck.zones.deployed).toContain(card.instanceId);
    expect(result.protocolBindingsInstalled).toBe(1);
    expect(result.state.combat?.triggerBindings).toHaveLength(1);
  });

  it("does not retroactively trigger on its own installing play", () => {
    const card = sourceCard("source.thick_skin");
    const state = createCombat({ cards: [card] });

    const result = play(state, card);

    expect(actorOf(result.state, SOURCE_ACTOR).block).toBe(0);
  });

  it("grants 3 Block once after the next Source Lead card at base", () => {
    const thickSkin = sourceCard("source.thick_skin");
    const openWound = sourceCard("source.open_wound");
    const groundFault = sourceCard("source.ground_fault");
    const state = createCombat({ cards: [thickSkin, openWound, groundFault] });

    let current = play(state, thickSkin).state;
    current = play(current, openWound, { target: ENEMY_ACTOR }).state;
    expect(actorOf(current, SOURCE_ACTOR).block).toBe(3);

    current = play(current, groundFault, { target: ENEMY_ACTOR }).state;
    expect(actorOf(current, SOURCE_ACTOR).block).toBe(3);
  });

  it("grants 5 Block when upgraded", () => {
    const thickSkin = sourceCard("source.thick_skin");
    const openWound = sourceCard("source.open_wound");
    const state = createCombat({ cards: [thickSkin, openWound] });

    let current = play(state, thickSkin, { upgraded: true }).state;
    current = play(current, openWound, { target: ENEMY_ACTOR }).state;

    expect(actorOf(current, SOURCE_ACTOR).block).toBe(5);
  });

  it("stacks independently across multiple deployed copies", () => {
    const thickSkinA = sourceCard("source.thick_skin");
    const thickSkinB = sourceCard("source.thick_skin");
    const openWound = sourceCard("source.open_wound");
    const state = createCombat({ cards: [thickSkinA, thickSkinB, openWound] });

    let current = play(state, thickSkinA).state;
    current = play(current, thickSkinB).state;
    expect(current.combat?.triggerBindings).toHaveLength(2);

    current = play(current, openWound, { target: ENEMY_ACTOR }).state;

    expect(actorOf(current, SOURCE_ACTOR).block).toBe(6);
  });
});

describe("Unlicensed Procedure", () => {
  it("pays 3 owner HP before dealing 16 damage at base", () => {
    const card = sourceCard("source.unlicensed_procedure");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });

    expect(actorOf(result.state, SOURCE_ACTOR).hp).toBe(41);
    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(84);
  });

  it("deals 21 damage when upgraded while the HP cost remains 3", () => {
    const card = sourceCard("source.unlicensed_procedure");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });

    expect(actorOf(result.state, SOURCE_ACTOR).hp).toBe(41);
    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(79);
  });

  it("still collects the HP cost even when the attack kills the last enemy", () => {
    const card = sourceCard("source.unlicensed_procedure");
    const state = createCombat({
      cards: [card],
      enemies: [{ actorId: ENEMY_ACTOR, maxHp: 10 }],
    });

    const result = play(state, card, { target: ENEMY_ACTOR });

    expect(actorOf(result.state, SOURCE_ACTOR).hp).toBe(41);
    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(0);
    expect(result.state.combat?.outcome).toBe("victory");
  });
});

describe("Strength, Weak, and Exposed interact through the existing attack math", () => {
  it("combines Strength, Weak, and Exposed with a single floor at the end", () => {
    const card = sourceCard("source.open_wound");
    let state = createCombat({ cards: [card] });
    state = setCombatStatusForTesting(state, SOURCE_ACTOR, "strength", 2);
    state = setCombatStatusForTesting(state, SOURCE_ACTOR, "weak", 1);
    state = setCombatStatusForTesting(state, ENEMY_ACTOR, "exposed", 1);

    const result = play(state, card, { target: ENEMY_ACTOR });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    // (7 printed + 2 Strength) * 0.75 Weak * 1.5 Exposed = 10.125, floored once to 10.
    expect(enemy.hp).toBe(90);
    // Bleed is a status application, not attack damage, so it is unaffected by Weak/Exposed.
    expect(getStatusAmount(enemy.statuses, "bleed")).toBe(2);
  });
});

describe("Lead/Support classification through the M07/M08 Imprint and Reaction system", () => {
  it("Primes an Imprint and can trigger a Reaction when played as a Source Lead card", () => {
    const card = sourceCard("source.open_wound");
    const state = createCombat({
      cards: [card],
      enemies: [{ actorId: ENEMY_ACTOR, maxHp: 100 }],
      storedImprint: { kind: "form", id: "needle", prime: 2 },
    });

    const result = play(state, card, { target: ENEMY_ACTOR });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    expect(result.classification).toBe("lead");
    expect(result.reaction).not.toBeNull();
    expect(result.reaction?.recipeId).toBe("reaction.staple_gun");
    // Base effect (7 damage + 2 Bleed) plus Staple Gun at Potency 2 (6*2 damage + 2*2 Bleed).
    expect(enemy.hp).toBe(100 - 7 - 12);
    expect(getStatusAmount(enemy.statuses, "bleed")).toBe(2 + 4);
    expect(result.resultingImprint).toMatchObject({
      ownerCharacterId: SOURCE_ACTOR,
      ingredient: { kind: "material", id: "gore" },
      potency: 1,
    });
  });

  it("performs printed base effects but does not Prime or trigger a Reaction as a Support card", () => {
    const card = sourceCard("source.open_wound");
    const state = createCombat({
      cards: [card],
      frontActorId: SHAPER_ACTOR,
      enemies: [{ actorId: ENEMY_ACTOR, maxHp: 100 }],
    });

    const result = play(state, card, { target: ENEMY_ACTOR });
    const enemy = actorOf(result.state, ENEMY_ACTOR);

    expect(result.classification).toBe("support");
    expect(enemy.hp).toBe(93);
    expect(getStatusAmount(enemy.statuses, "bleed")).toBe(2);
    expect(result.reaction).toBeNull();
    expect(result.resultingImprint).toBeNull();
  });
});

describe("Card conservation across all zones", () => {
  it("preserves every card instance across discard, exhaust, deployed, and hand after mixed plays", () => {
    const attack = sourceCard("source.open_wound");
    const exhausting = sourceCard("source.blood_bank");
    const protocol = sourceCard("source.thick_skin");
    const retained = sourceCard("source.surgical_tape");
    const cards = [attack, exhausting, protocol, retained];
    const state = createCombat({ cards });

    let current = play(state, attack, { target: ENEMY_ACTOR }).state;
    current = play(current, exhausting).state;
    current = play(current, protocol).state;

    current = endPlayerTurnWithCardLifecycle(current, (instance) =>
      cardLifecycleSpecFor(requireDefinition(instance.definitionId), []),
    );

    const deck = deckOf(current);
    expect(Object.keys(deck.instances)).toHaveLength(cards.length);
    expect(deck.zones.discard).toEqual([attack.instanceId]);
    expect(deck.zones.exhaust).toEqual([exhausting.instanceId]);
    expect(deck.zones.deployed).toEqual([protocol.instanceId]);
    expect(deck.zones.hand).toEqual([retained.instanceId]);

    const totalInZones =
      deck.zones.draw.length +
      deck.zones.hand.length +
      deck.zones.discard.length +
      deck.zones.exhaust.length +
      deck.zones.deployed.length;
    expect(totalInZones).toBe(cards.length);
    expect(() => assertCardConservation(deck)).not.toThrow();
  });
});
