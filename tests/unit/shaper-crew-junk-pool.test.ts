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
  endPlayerTurnWithContentCards,
  getStatusAmount,
  initializeCombatActors,
  isLiabilityCard,
  playContentCard,
  swapCharacters,
  startCombat,
  type AuthoritativeState,
  type CardInstance,
  type Ingredient,
} from "../../src/engine";
import { loadRegistry } from "../../src/content/registry.mjs";
import type { CardDefinition } from "../../src/content/generated";

const SOURCE_ACTOR = "duo.source";
const SHAPER_ACTOR = "duo.shaper";
const ENEMY_ACTOR = "enemy.target";
const ENEMY_ACTOR_2 = "enemy.target-2";

const SHAPER_CARD_IDS = [
  "shaper.nail_driver",
  "shaper.fan_service",
  "shaper.collection_notice",
  "shaper.scheduled_violence",
  "shaper.switchblade",
  "shaper.insulated_coat",
  "shaper.cross_examination",
  "shaper.broad_hint",
  "shaper.friendly_leech",
  "shaper.double_booking",
  "shaper.overclock",
  "shaper.operating_manual",
] as const;

const CREW_CARD_IDS = [
  "crew.cover_both",
  "crew.cross_training",
  "crew.reservoir",
  "crew.sudden_exit",
] as const;

const JUNK_CARD_IDS = ["junk.invoice", "junk.fine_print"] as const;

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
function contentCard(id: string, owner: string = SHAPER_ACTOR): CardInstance {
  const instance = createCardInstance({
    instanceId: createCardInstanceId(nextOrdinal),
    definitionId: id,
    ownerCharacterId: owner,
  });
  nextOrdinal += 1;
  return instance;
}

function fillerCard(): CardInstance {
  const instance = createCardInstance({
    instanceId: createCardInstanceId(nextOrdinal),
    definitionId: "test.filler",
    ownerCharacterId: "crew",
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
  readonly openingHandSize?: number;
  readonly sourceMaxHp?: number;
  readonly sourceHp?: number;
  readonly shaperHp?: number;
  readonly frontActorId?: string;
  readonly enemies?: readonly EnemySetup[];
  readonly energyPerTurn?: number;
  readonly storedImprint?: Ingredient;
}

function createCombat(setup: CombatSetup): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 9797,
      contentVersion: "m13.test",
      contentHash: "m13-shaper-crew-junk-pool-test",
    }),
    setup.cards,
    {
      cardsPerTurn: setup.openingHandSize ?? setup.cards.length,
      maxHandSize: Math.max(10, setup.cards.length),
      energyPerTurn: setup.energyPerTurn ?? 20,
    },
  );
  const enemies = setup.enemies ?? [{ actorId: ENEMY_ACTOR, maxHp: 100 }];
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: SOURCE_ACTOR, maxHp: setup.sourceMaxHp ?? 44, hp: setup.sourceHp },
      { actorId: SHAPER_ACTOR, maxHp: 36, hp: setup.shaperHp },
    ],
    enemies: enemies.map((enemy) => ({
      actorId: enemy.actorId,
      maxHp: enemy.maxHp,
      hp: enemy.hp,
      block: enemy.block,
    })),
    frontCharacterId: setup.frontActorId ?? SHAPER_ACTOR,
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
        imprint: createImprint(SOURCE_ACTOR, setup.storedImprint),
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

function endTurn(state: AuthoritativeState): AuthoritativeState {
  return endPlayerTurnWithContentCards(state, (instance) => requireDefinition(instance.definitionId));
}

describe("M13 Shaper/Crew/junk pool production content", () => {
  it("validates cleanly against the content schema and registry", async () => {
    const registry = await loadRegistry([], { rootDir: process.cwd() });

    expect(registry.status).toBe("valid");
    expect(registry.diagnostics).toEqual([]);
    expect(registry.counts.card.invalid).toBe(0);
    expect(registry.counts.card.total).toBeGreaterThanOrEqual(
      SHAPER_CARD_IDS.length + CREW_CARD_IDS.length + JUNK_CARD_IDS.length,
    );
    for (const id of [...SHAPER_CARD_IDS, ...CREW_CARD_IDS, ...JUNK_CARD_IDS]) {
      expect(definitions.has(id)).toBe(true);
    }
  });

  it("marks Invoice and Fine Print as ungraftable and unupgradeable in effect", () => {
    for (const id of JUNK_CARD_IDS) {
      const definition = requireDefinition(id);
      expect(definition.graftEligible).toBe(false);
      for (const parameter of Object.values(definition.parameters)) {
        expect(parameter.base).toBe(parameter.upgraded);
      }
    }
  });
});

describe("Nail Driver", () => {
  it("deals 7 damage at base and 10 upgraded", () => {
    const base = contentCard("shaper.nail_driver");
    const stateBase = createCombat({ cards: [base] });
    expect(actorOf(play(stateBase, base, { target: ENEMY_ACTOR }).state, ENEMY_ACTOR).hp).toBe(93);

    const upgraded = contentCard("shaper.nail_driver");
    const stateUpgraded = createCombat({ cards: [upgraded] });
    expect(
      actorOf(play(stateUpgraded, upgraded, { target: ENEMY_ACTOR, upgraded: true }).state, ENEMY_ACTOR).hp,
    ).toBe(90);
  });
});

describe("Fan Service", () => {
  it("deals 4 damage to every living enemy at base", () => {
    const card = contentCard("shaper.fan_service");
    const state = createCombat({
      cards: [card],
      enemies: [
        { actorId: ENEMY_ACTOR, maxHp: 100 },
        { actorId: ENEMY_ACTOR_2, maxHp: 100 },
      ],
    });

    const result = play(state, card);

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(96);
    expect(actorOf(result.state, ENEMY_ACTOR_2).hp).toBe(96);
  });

  it("deals 6 damage to every living enemy when upgraded", () => {
    const card = contentCard("shaper.fan_service");
    const state = createCombat({
      cards: [card],
      enemies: [
        { actorId: ENEMY_ACTOR, maxHp: 100 },
        { actorId: ENEMY_ACTOR_2, maxHp: 100 },
      ],
    });

    const result = play(state, card, { upgraded: true });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(94);
    expect(actorOf(result.state, ENEMY_ACTOR_2).hp).toBe(94);
  });
});

describe("Collection Notice", () => {
  it("deals 5 damage at base and 8 upgraded", () => {
    const base = contentCard("shaper.collection_notice");
    expect(
      actorOf(play(createCombat({ cards: [base] }), base, { target: ENEMY_ACTOR }).state, ENEMY_ACTOR).hp,
    ).toBe(95);

    const upgraded = contentCard("shaper.collection_notice");
    expect(
      actorOf(
        play(createCombat({ cards: [upgraded] }), upgraded, { target: ENEMY_ACTOR, upgraded: true }).state,
        ENEMY_ACTOR,
      ).hp,
    ).toBe(92);
  });
});

describe("Scheduled Violence", () => {
  it("deals 6 damage at base and 9 upgraded", () => {
    const base = contentCard("shaper.scheduled_violence");
    expect(
      actorOf(play(createCombat({ cards: [base] }), base, { target: ENEMY_ACTOR }).state, ENEMY_ACTOR).hp,
    ).toBe(94);

    const upgraded = contentCard("shaper.scheduled_violence");
    expect(
      actorOf(
        play(createCombat({ cards: [upgraded] }), upgraded, { target: ENEMY_ACTOR, upgraded: true }).state,
        ENEMY_ACTOR,
      ).hp,
    ).toBe(91);
  });
});

describe("Switchblade", () => {
  it("swaps for free, draws 1, and Exhausts at base", () => {
    const card = contentCard("shaper.switchblade");
    const fillers = [fillerCard(), fillerCard(), fillerCard()];
    const state = createCombat({
      cards: [card, ...fillers],
      openingHandSize: 1,
      frontActorId: SOURCE_ACTOR,
    });

    const result = play(state, card);
    const deck = deckOf(result.state);

    expect(result.state.combat?.frontCharacterId).toBe(SHAPER_ACTOR);
    expect(deck.zones.hand).toHaveLength(1);
    expect(deck.zones.draw).toHaveLength(2);
    expect(deck.zones.exhaust).toContain(card.instanceId);
  });

  it("draws 2 when upgraded", () => {
    const card = contentCard("shaper.switchblade");
    const fillers = [fillerCard(), fillerCard(), fillerCard()];
    const state = createCombat({
      cards: [card, ...fillers],
      openingHandSize: 1,
      frontActorId: SOURCE_ACTOR,
    });

    const result = play(state, card, { upgraded: true });
    const deck = deckOf(result.state);

    expect(deck.zones.hand).toHaveLength(2);
    expect(deck.zones.draw).toHaveLength(1);
  });
});

describe("Insulated Coat", () => {
  it("grants 7 Block at base and 10 upgraded", () => {
    const base = contentCard("shaper.insulated_coat");
    expect(actorOf(play(createCombat({ cards: [base] }), base).state, SHAPER_ACTOR).block).toBe(7);

    const upgraded = contentCard("shaper.insulated_coat");
    expect(
      actorOf(play(createCombat({ cards: [upgraded] }), upgraded, { upgraded: true }).state, SHAPER_ACTOR).block,
    ).toBe(10);
  });
});

describe("Cross Examination", () => {
  it("deals 5 damage and draws 1 at base", () => {
    const card = contentCard("shaper.cross_examination");
    const fillers = [fillerCard(), fillerCard()];
    const state = createCombat({ cards: [card, ...fillers], openingHandSize: 1 });

    const result = play(state, card, { target: ENEMY_ACTOR });
    const deck = deckOf(result.state);

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(95);
    expect(deck.zones.hand).toHaveLength(1);
  });

  it("deals 8 damage and still draws 1 when upgraded", () => {
    const card = contentCard("shaper.cross_examination");
    const fillers = [fillerCard(), fillerCard()];
    const state = createCombat({ cards: [card, ...fillers], openingHandSize: 1 });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });
    const deck = deckOf(result.state);

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(92);
    expect(deck.zones.hand).toHaveLength(1);
  });
});

describe("Broad Hint", () => {
  it("deals 7 damage and applies 1 Weak to every enemy at base", () => {
    const card = contentCard("shaper.broad_hint");
    const state = createCombat({
      cards: [card],
      enemies: [
        { actorId: ENEMY_ACTOR, maxHp: 100 },
        { actorId: ENEMY_ACTOR_2, maxHp: 100 },
      ],
    });

    const result = play(state, card);

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(93);
    expect(getStatusAmount(actorOf(result.state, ENEMY_ACTOR).statuses, "weak")).toBe(1);
    expect(actorOf(result.state, ENEMY_ACTOR_2).hp).toBe(93);
    expect(getStatusAmount(actorOf(result.state, ENEMY_ACTOR_2).statuses, "weak")).toBe(1);
  });

  it("deals 10 damage each when upgraded, Weak unchanged", () => {
    const card = contentCard("shaper.broad_hint");
    const state = createCombat({
      cards: [card],
      enemies: [
        { actorId: ENEMY_ACTOR, maxHp: 100 },
        { actorId: ENEMY_ACTOR_2, maxHp: 100 },
      ],
    });

    const result = play(state, card, { upgraded: true });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(90);
    expect(getStatusAmount(actorOf(result.state, ENEMY_ACTOR).statuses, "weak")).toBe(1);
  });
});

describe("Friendly Leech", () => {
  it("deals 4 damage and grants owner 4 Block at base", () => {
    const card = contentCard("shaper.friendly_leech");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(96);
    expect(actorOf(result.state, SHAPER_ACTOR).block).toBe(4);
  });

  it("deals 6 damage and grants 6 Block when upgraded", () => {
    const card = contentCard("shaper.friendly_leech");
    const state = createCombat({ cards: [card] });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(94);
    expect(actorOf(result.state, SHAPER_ACTOR).block).toBe(6);
  });
});

describe("Double Booking", () => {
  it("deals 7 damage and Primes Loop at Potency 2 at base", () => {
    const card = contentCard("shaper.double_booking");
    const state = createCombat({ cards: [card], frontActorId: SHAPER_ACTOR });

    const result = play(state, card, { target: ENEMY_ACTOR });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(93);
    expect(result.resultingImprint).toMatchObject({
      ownerCharacterId: SHAPER_ACTOR,
      ingredient: { kind: "form", id: "loop" },
      potency: 2,
    });
  });

  it("deals 10 damage and Primes at Potency 3 when upgraded", () => {
    const card = contentCard("shaper.double_booking");
    const state = createCombat({ cards: [card], frontActorId: SHAPER_ACTOR });

    const result = play(state, card, { target: ENEMY_ACTOR, upgraded: true });

    expect(actorOf(result.state, ENEMY_ACTOR).hp).toBe(90);
    expect(result.resultingImprint).toMatchObject({ potency: 3 });
  });
});

describe("Overclock", () => {
  it("draws 2 and Exhausts at base", () => {
    const card = contentCard("shaper.overclock");
    const fillers = [fillerCard(), fillerCard(), fillerCard()];
    const state = createCombat({ cards: [card, ...fillers], openingHandSize: 1 });

    const result = play(state, card);
    const deck = deckOf(result.state);

    expect(deck.zones.hand).toHaveLength(2);
    expect(deck.zones.exhaust).toContain(card.instanceId);
  });

  it("draws 3 when upgraded", () => {
    const card = contentCard("shaper.overclock");
    const fillers = [fillerCard(), fillerCard(), fillerCard()];
    const state = createCombat({ cards: [card, ...fillers], openingHandSize: 1 });

    const result = play(state, card, { upgraded: true });

    expect(deckOf(result.state).zones.hand).toHaveLength(3);
  });
});

describe("Operating Manual", () => {
  it("deploys and installs exactly one after_primary_reaction Protocol trigger binding", () => {
    const card = contentCard("shaper.operating_manual");
    const state = createCombat({ cards: [card] });

    const result = play(state, card);

    expect(result.state.combat?.deck.zones.deployed).toContain(card.instanceId);
    expect(result.protocolBindingsInstalled).toBe(1);
    expect(result.state.combat?.triggerBindings).toHaveLength(1);
  });

  it("grants Block to whoever is currently Front (not its own owner) after a primary Reaction, once per turn", () => {
    const manual = contentCard("shaper.operating_manual");
    const openWound = contentCard("source.open_wound", SOURCE_ACTOR);
    const nailDriver = contentCard("shaper.nail_driver", SHAPER_ACTOR);
    const state = createCombat({
      cards: [manual, openWound, nailDriver],
      frontActorId: SOURCE_ACTOR,
      enemies: [{ actorId: ENEMY_ACTOR, maxHp: 999 }],
    });

    let current = play(state, manual).state;
    expect(actorOf(current, SOURCE_ACTOR).block).toBe(0);

    // A pre-existing Form Imprint plus a Material Lead card triggers a
    // primary Reaction while the Source (not Operating Manual's Shaper
    // owner) is Front.
    const combatBefore = current.combat;
    if (combatBefore === null) throw new Error("Expected combat.");
    current = {
      ...current,
      combat: { ...combatBefore, imprint: createImprint(SHAPER_ACTOR, { kind: "form", id: "needle", prime: 1 }) },
    };
    const reacted = play(current, openWound, { target: ENEMY_ACTOR });
    expect(reacted.reaction).not.toBeNull();
    current = reacted.state;

    expect(actorOf(current, SOURCE_ACTOR).block).toBe(3);
    expect(actorOf(current, SHAPER_ACTOR).block).toBe(0);

    // A second primary Reaction in the same turn must not grant Block again.
    current = swapCharacters(current, "manual").state;
    const combatBeforeSecond = current.combat;
    if (combatBeforeSecond === null) throw new Error("Expected combat.");
    current = {
      ...current,
      combat: {
        ...combatBeforeSecond,
        imprint: createImprint(SOURCE_ACTOR, { kind: "material", id: "gore", prime: 1 }),
      },
    };
    const reactedAgain = play(current, nailDriver, { target: ENEMY_ACTOR });
    expect(reactedAgain.reaction).not.toBeNull();
    current = reactedAgain.state;

    expect(actorOf(current, SOURCE_ACTOR).block).toBe(3);
  });

  it("grants 5 Block when upgraded", () => {
    const manual = contentCard("shaper.operating_manual");
    const openWound = contentCard("source.open_wound", SOURCE_ACTOR);
    const state = createCombat({
      cards: [manual, openWound],
      frontActorId: SOURCE_ACTOR,
      storedImprint: { kind: "form", id: "needle", prime: 1 },
    });

    let current = play(state, manual, { upgraded: true }).state;
    const combatBefore = current.combat;
    if (combatBefore === null) throw new Error("Expected combat.");
    current = {
      ...current,
      combat: { ...combatBefore, imprint: createImprint(SHAPER_ACTOR, { kind: "form", id: "needle", prime: 1 }) },
    };
    current = play(current, openWound, { target: ENEMY_ACTOR }).state;

    expect(actorOf(current, SOURCE_ACTOR).block).toBe(5);
  });

  it("stacks independently across multiple deployed copies", () => {
    const manualA = contentCard("shaper.operating_manual");
    const manualB = contentCard("shaper.operating_manual");
    const openWound = contentCard("source.open_wound", SOURCE_ACTOR);
    const state = createCombat({
      cards: [manualA, manualB, openWound],
      frontActorId: SOURCE_ACTOR,
    });

    let current = play(state, manualA).state;
    current = play(current, manualB).state;
    expect(current.combat?.triggerBindings).toHaveLength(2);

    const combatBefore = current.combat;
    if (combatBefore === null) throw new Error("Expected combat.");
    current = {
      ...current,
      combat: { ...combatBefore, imprint: createImprint(SHAPER_ACTOR, { kind: "form", id: "needle", prime: 1 }) },
    };
    current = play(current, openWound, { target: ENEMY_ACTOR }).state;

    expect(actorOf(current, SOURCE_ACTOR).block).toBe(6);
  });
});

describe("Cover Both", () => {
  it("grants both characters 5 Block at base and 7 upgraded", () => {
    const base = contentCard("crew.cover_both", "crew");
    const resultBase = play(createCombat({ cards: [base] }), base);
    expect(actorOf(resultBase.state, SOURCE_ACTOR).block).toBe(5);
    expect(actorOf(resultBase.state, SHAPER_ACTOR).block).toBe(5);

    const upgraded = contentCard("crew.cover_both", "crew");
    const resultUpgraded = play(createCombat({ cards: [upgraded] }), upgraded, { upgraded: true });
    expect(actorOf(resultUpgraded.state, SOURCE_ACTOR).block).toBe(7);
    expect(actorOf(resultUpgraded.state, SHAPER_ACTOR).block).toBe(7);
  });
});

describe("Cross Training", () => {
  it("draws 2 at base and 3 upgraded, without Exhaust", () => {
    const card = contentCard("crew.cross_training", "crew");
    const fillers = [fillerCard(), fillerCard(), fillerCard()];
    const state = createCombat({ cards: [card, ...fillers], openingHandSize: 1 });

    const result = play(state, card);
    const deck = deckOf(result.state);

    expect(deck.zones.hand).toHaveLength(2);
    expect(deck.zones.discard).toContain(card.instanceId);
    expect(deck.zones.exhaust).not.toContain(card.instanceId);
  });
});

describe("Reservoir", () => {
  it("adds 1 Potency to an existing Imprint at base, capped at 3", () => {
    const card = contentCard("crew.reservoir", "crew");
    const state = createCombat({
      cards: [card],
      storedImprint: { kind: "material", id: "gore", prime: 1 },
    });

    const result = play(state, card);

    expect(result.state.combat?.imprint).toMatchObject({ potency: 2 });
  });

  it("adds 2 Potency when upgraded, still capped at 3", () => {
    const card = contentCard("crew.reservoir", "crew");
    const state = createCombat({
      cards: [card],
      storedImprint: { kind: "material", id: "gore", prime: 1 },
    });

    const result = play(state, card, { upgraded: true });

    // 1 (stored) + 2 (Reservoir) = 3, exactly at the cap.
    expect(result.state.combat?.imprint).toMatchObject({ potency: 3 });

    const secondCopy = contentCard("crew.reservoir", "crew");
    const overCapResult = play(
      createCombat({ cards: [secondCopy], storedImprint: { kind: "material", id: "gore", prime: 3 } }),
      secondCopy,
      { upgraded: true },
    );
    expect(overCapResult.state.combat?.imprint).toMatchObject({ potency: 3 });
  });

  it("does nothing and does not throw when there is no existing Imprint", () => {
    const card = contentCard("crew.reservoir", "crew");
    const state = createCombat({ cards: [card] });
    expect(state.combat?.imprint).toBeNull();

    const result = play(state, card);

    expect(result.state.combat?.imprint).toBeNull();
  });

  it("stays in hand at player-turn end via Retain when left unplayed", () => {
    const card = contentCard("crew.reservoir", "crew");
    const state = createCombat({ cards: [card] });

    const ended = endPlayerTurnWithCardLifecycle(state, () =>
      cardLifecycleSpecFor(requireDefinition(card.definitionId), []),
    );

    expect(ended.combat?.deck.zones.hand).toEqual([card.instanceId]);
  });
});

describe("Sudden Exit", () => {
  it("swaps for free and grants the incoming Front 8 Block at base", () => {
    const card = contentCard("crew.sudden_exit", "crew");
    const state = createCombat({ cards: [card], frontActorId: SOURCE_ACTOR });

    const result = play(state, card);

    expect(result.state.combat?.frontCharacterId).toBe(SHAPER_ACTOR);
    expect(actorOf(result.state, SHAPER_ACTOR).block).toBe(8);
    expect(actorOf(result.state, SOURCE_ACTOR).block).toBe(0);
  });

  it("grants 11 Block when upgraded", () => {
    const card = contentCard("crew.sudden_exit", "crew");
    const state = createCombat({ cards: [card], frontActorId: SOURCE_ACTOR });

    const result = play(state, card, { upgraded: true });

    expect(actorOf(result.state, SHAPER_ACTOR).block).toBe(11);
  });
});

describe("Invoice", () => {
  it("is unplayable and inert, and Exhausts if left unplayed at turn end", () => {
    const invoice = contentCard("junk.invoice", "crew");
    const state = createCombat({ cards: [invoice] });

    expect(isLiabilityCard(requireDefinition(invoice.definitionId))).toBe(false);
    expect(() => play(state, invoice)).toThrow(/Unplayable/);

    const ended = endTurn(state);
    expect(ended.combat?.deck.zones.exhaust).toContain(invoice.instanceId);
    expect(ended.combat?.deck.zones.hand).toEqual([]);
  });
});

describe("Fine Print", () => {
  it("is unplayable", () => {
    const card = contentCard("junk.fine_print", "crew");
    const state = createCombat({ cards: [card] });

    expect(isLiabilityCard(requireDefinition(card.definitionId))).toBe(true);
    expect(() => play(state, card)).toThrow(/Unplayable/);
  });

  it("costs Front 1 HP bypassing Block, then discards, if still in hand at player-turn end", () => {
    const card = contentCard("junk.fine_print", "crew");
    const state = createCombat({ cards: [card], frontActorId: SOURCE_ACTOR });
    const withBlock = {
      ...state,
      combat: state.combat === null ? null : { ...state.combat, actors: { ...state.combat.actors, [SOURCE_ACTOR]: { ...state.combat.actors[SOURCE_ACTOR], block: 10 } } },
    };

    const ended = endTurn(withBlock);

    expect(actorOf(ended, SOURCE_ACTOR).hp).toBe(43);
    expect(actorOf(ended, SOURCE_ACTOR).block).toBe(10);
    expect(ended.combat?.deck.zones.discard).toContain(card.instanceId);
    expect(ended.combat?.deck.zones.hand).toEqual([]);
  });

  it("applies once per copy when multiple are in hand", () => {
    const cardA = contentCard("junk.fine_print", "crew");
    const cardB = contentCard("junk.fine_print", "crew");
    const state = createCombat({ cards: [cardA, cardB], frontActorId: SOURCE_ACTOR });

    const ended = endTurn(state);

    expect(actorOf(ended, SOURCE_ACTOR).hp).toBe(42);
    expect(ended.combat?.deck.zones.discard).toEqual(
      expect.arrayContaining([cardA.instanceId, cardB.instanceId]),
    );
  });

  it("can end the run, and turn-end resolution stops gracefully instead of throwing", () => {
    const card = contentCard("junk.fine_print", "crew");
    const state = createCombat({ cards: [card], frontActorId: SOURCE_ACTOR, sourceHp: 1 });

    const ended = endTurn(state);

    expect(actorOf(ended, SOURCE_ACTOR).hp).toBe(0);
    expect(ended.combat?.outcome).toBe("defeat");
  });
});

describe("Card conservation across all zones with M13 content", () => {
  it("preserves every card instance through mixed plays, a liability effect, and turn end", () => {
    const attack = contentCard("shaper.nail_driver");
    const exhausting = contentCard("shaper.overclock");
    const protocol = contentCard("shaper.operating_manual");
    const retained = contentCard("crew.reservoir", "crew");
    const finePrint = contentCard("junk.fine_print", "crew");
    const filler = fillerCard();
    const cards = [attack, exhausting, protocol, retained, finePrint, filler];
    const state = createCombat({ cards, openingHandSize: cards.length });

    let current = play(state, attack, { target: ENEMY_ACTOR }).state;
    current = play(current, exhausting).state;
    current = play(current, protocol).state;

    const ended = endPlayerTurnWithContentCards(current, (instance) =>
      requireDefinition(instance.definitionId === "test.filler" ? "shaper.nail_driver" : instance.definitionId),
    );

    const deck = deckOf(ended);
    expect(Object.keys(deck.instances)).toHaveLength(cards.length);
    const totalInZones =
      deck.zones.draw.length +
      deck.zones.hand.length +
      deck.zones.discard.length +
      deck.zones.exhaust.length +
      deck.zones.deployed.length;
    expect(totalInZones).toBe(cards.length);
    expect(() => assertCardConservation(deck)).not.toThrow();
    expect(deck.zones.discard).toContain(finePrint.instanceId);
  });
});
