import { beforeAll, describe, expect, it } from "vitest";
import { loadRegistry } from "../../src/content/registry.mjs";
import {
  CARD_KEYWORD_GLOSSARY,
  CARD_KEYWORDS,
  M10_STARTER_CARDS,
  describeContentCard,
  describeEffect,
  describeM10StarterCard,
  describeUnplayableCard,
  keywordText,
  positionText,
  type CardExplanation,
} from "../../src/engine";
import type { CardDefinition, CommonSchema, Effect } from "../../src/content/generated";

let template: CardDefinition;
let contentCards: readonly CardDefinition[];

beforeAll(async () => {
  const registry = await loadRegistry([], { rootDir: process.cwd() });
  contentCards = registry.definitions
    .filter((definition) => definition.kind === "card")
    .map((definition) => definition.data as CardDefinition);
  const first = contentCards[0];
  if (first === undefined) throw new Error("Expected at least one card definition.");
  template = first;
});

function cardWith(effects: readonly Effect[], rest: Partial<CardDefinition> = {}): CardDefinition {
  return {
    ...template,
    id: "test.fixture",
    name: "Test Fixture",
    parameters: {},
    energyCost: { const: 1 },
    additionalCosts: [],
    target: "none",
    ingredient: null,
    keywords: [],
    effects: [...effects],
    ...rest,
  } as CardDefinition;
}

function summary(effects: readonly Effect[]): string {
  return describeContentCard(cardWith(effects)).summary;
}

describe("card text derivation", () => {
  it("describes every schema effect operation in one exact sentence", () => {
    const cases: ReadonlyArray<readonly [Effect, string]> = [
      [
        { op: "damage", target: "selected_enemy", amount: { const: 6 }, hits: 1, category: "attack" },
        "Deal 6 damage to the selected enemy.",
      ],
      [
        { op: "damage", target: "all_enemies", amount: { const: 3 }, hits: 2, category: "attack" },
        "Deal 3 damage to all enemies 2 times.",
      ],
      [
        { op: "damage", target: "selected_enemy", amount: { const: 4 }, hits: 1, category: "direct" },
        "Deal 4 damage to the selected enemy, ignoring Block.",
      ],
      [{ op: "block", target: "both", amount: { const: 3 } }, "Gain 3 Block on both characters."],
      [{ op: "block", target: "owner", amount: { const: 5 } }, "Gain 5 Block."],
      [
        { op: "heal", target: "owner", amount: { const: 4 }, recoveryCategory: "other" },
        "Heal 4 HP on the card's owner.",
      ],
      [
        { op: "apply_status", target: "selected_enemy", status: "bleed", amount: { const: 2 } },
        "Apply 2 Bleed to the selected enemy.",
      ],
      [{ op: "draw", amount: { const: 2 } }, "Draw 2 cards."],
      [{ op: "draw", amount: { const: 1 } }, "Draw 1 card."],
      [{ op: "gain_energy", amount: { const: 1 } }, "Gain 1 Energy."],
      [{ op: "swap", mode: "free" }, "Swap characters without spending Energy."],
      [
        { op: "boost_imprint", amount: { const: 1 } },
        "Increase the stored Imprint's Potency by 1.",
      ],
      [
        { op: "add_card", cardId: "junk.invoice", destination: "player_hand", temporary: true },
        "Add junk.invoice to the hand as a temporary card.",
      ],
      [
        {
          op: "install_protocol",
          trigger: {
            event: "player_turn_start",
            filter: { source_owner: "source" },
            effects: [{ op: "block", target: "owner", amount: { const: 2 } }],
            limit: { scope: "turn", count: 1, keying: "source" },
            priority: 0,
          },
        },
        "Install a Protocol that will fire at player-turn start while the acting character is source (limit 1 per turn): Gain 2 Block.",
      ],
      [
        {
          op: "schedule_packet",
          timing: "next_player_turn_start",
          packet: {
            effects: [
              { op: "damage", target: "selected_enemy", amount: { const: 5 }, hits: 1, category: "attack" },
            ],
          },
        },
        "At the next player turn start, resolve: Deal 5 damage to the selected enemy.",
      ],
      [
        { op: "repeat_packet", packetRef: "compensation.packet", multiplier: 1, timing: "next_player_turn_start" },
        "Repeat compensation.packet 1 time at the next player turn start.",
      ],
      [
        { op: "repeat_reaction_packet", multiplierBps: 5000 },
        "Repeat the triggering Reaction at 50% power.",
      ],
      [{ op: "reduce_card_cost", amount: { const: 1 } }, "Reduce a card's Energy cost by 1."],
      [
        { op: "repeat_scheduled_packet", multiplierBps: 5000 },
        "Repeat each scheduled packet at 50% power.",
      ],
      [{ op: "gain_scrap", amount: { const: 5 } }, "Gain 5 Scrap."],
      [{ op: "gain_evidence", amount: { const: 1 } }, "Gain 1 Evidence."],
      [
        { op: "change_standing", factionId: "office", amount: 2 },
        "Change office standing by 2.",
      ],
      [{ op: "set_flag", flagId: "accepted_bribe", value: true }, 'Record the "accepted_bribe" run flag as true.'],
      [{ op: "remove_card", selection: { type: "selected_card" } }, "Remove the chosen card from the deck permanently."],
      [{ op: "upgrade_card", selection: { type: "selected_card" } }, "Upgrade the chosen card permanently."],
    ];

    for (const [effect, expected] of cases) {
      expect(describeEffect(effect, new Map<string, number>())).toBe(expected);
      expect(summary([effect])).toBe(expected);
    }
  });

  it("resolves parameter values at base and upgraded levels", () => {
    const definition = cardWith(
      [
        { op: "damage", target: "selected_enemy", amount: { param: "damage" }, hits: 1, category: "attack" },
        { op: "draw", amount: { param: "drawAmount" } },
      ],
      {
        parameters: {
          damage: { base: 7, upgraded: 10 },
          drawAmount: { base: 1, upgraded: 2 },
        },
      },
    );

    expect(describeContentCard(definition).summary).toBe(
      "Deal 7 damage to the selected enemy. Draw 1 card.",
    );
    expect(describeContentCard(definition, { upgraded: true }).summary).toBe(
      "Upgraded — Deal 10 damage to the selected enemy. Draw 2 cards.",
    );
  });

  it("keeps symbolic text instead of guessing when a value is not a simple number", () => {
    const scaling = cardWith(
      [
        { op: "damage", target: "selected_enemy", amount: { stat: "imprint_potency" }, hits: 1, category: "attack" },
        { op: "draw", amount: { param: "unknownParameter" } },
      ],
    );

    expect(describeContentCard(scaling).summary).toBe(
      "Deal the Imprint's Potency damage to the selected enemy. Draw X (unknownParameter) cards.",
    );
  });

  it("reports cost, family, target, ingredient, and after-play rows for the popup", () => {
    const explanation = describeContentCard(
      cardWith(
        [{ op: "damage", target: "selected_enemy", amount: { param: "damage" }, hits: 1, category: "attack" }],
        {
          owner: "shaper",
          parameters: { damage: { base: 8, upgraded: 11 } },
          energyCost: { const: 2 },
          additionalCosts: [{ resource: "owner_hp", amount: { const: 3 } }],
          target: "enemy",
          ingredient: { kind: "form", id: "needle", prime: { const: 1 } },
          keywords: ["exhaust"],
        },
      ),
    );

    expect(explanation.lines).toEqual([
      { label: "Cost", text: "2 Energy" },
      { label: "Additional cost", text: "3 HP from this character" },
      { label: "Family", text: "Shaper" },
      { label: "Target", text: "the selected enemy" },
      { label: "Ingredient", text: "Needle · Prime 1 (Form)" },
      { label: "Base effect", text: "Deal 8 damage to the selected enemy." },
      { label: "After play", text: "Exhausts: it leaves the combat deck until combat ends." },
      {
        label: "Exhaust",
        text: "After being played, the card leaves the combat deck until combat ends.",
      },
    ]);
  });

  it("describes every shipped content card without falling back or throwing", () => {
    expect(contentCards.length).toBeGreaterThan(0);
    for (const definition of contentCards) {
      const explanation: CardExplanation = describeContentCard(definition);
      expect(explanation.summary.length, definition.id).toBeGreaterThan(0);
      expect(explanation.summary, definition.id).not.toContain("X (");
      expect(explanation.lines.map((line) => line.label), definition.id).toContain("Base effect");
      expect(explanation.lines.every((line) => line.text.length > 0), definition.id).toBe(true);
    }
  });

  it("describes every M10 starter card from its effects", () => {
    const expected: Readonly<Record<string, string>> = {
      "starter.repossess": "Deal 6 damage to the selected enemy.",
      "starter.sealant": "Gain 5 Block.",
      "starter.test_fire": "Deal 6 damage to the selected enemy.",
      "starter.safety_briefing": "Gain 5 Block.",
      "starter.shared_cover": "Gain 3 Block on both characters.",
      "starter.change_of_shift": "Swap characters without spending Energy.",
    };

    for (const [id, definition] of Object.entries(M10_STARTER_CARDS)) {
      const explanation = describeM10StarterCard(definition);
      expect(explanation.summary, id).toBe(expected[id]);
      expect(explanation.lines[0], id).toEqual({
        label: "Cost",
        text: `${definition.energyCost} Energy`,
      });
    }
  });

  it("describes the same effects identically regardless of card identity", () => {
    const first = describeContentCard(cardWith([{ op: "draw", amount: { const: 2 } }]));
    const second = describeContentCard(
      cardWith([{ op: "draw", amount: { const: 2 } }], {
        id: "test.other",
        name: "Another Card",
        owner: "crew",
      }),
    );

    expect(first).toEqual(second);
  });

  it("explains why a non-starter card in the test act is unplayable", () => {
    const explanation = describeUnplayableCard("junk.invoice");
    expect(explanation.lines).toContainEqual({ label: "Card", text: "junk.invoice" });
    expect(explanation.summary).toBe("Not playable in this checkpoint.");
  });

  it("covers every engine and schema keyword with rule text", () => {
    const schemaKeywords: readonly CommonSchema.Keyword[] = [
      "exhaust",
      "retain",
      "fleeting",
      "unplayable",
      "protocol",
      "liability",
    ];

    for (const keyword of schemaKeywords) {
      expect(keywordText(keyword), keyword).toBe(CARD_KEYWORD_GLOSSARY[keyword]);
      expect(CARD_KEYWORD_GLOSSARY[keyword].length, keyword).toBeGreaterThan(0);
    }
    for (const keyword of CARD_KEYWORDS) {
      expect(CARD_KEYWORD_GLOSSARY[keyword].length, keyword).toBeGreaterThan(0);
    }
    expect(keywordText("not_a_keyword")).toBeNull();
  });

  it("uses the lead, support, and crew rules text from the design spec", () => {
    expect(positionText("lead")).toContain("stores or strengthens the shared Imprint");
    expect(positionText("support")).toContain("stores no Imprint and triggers no Reaction");
    expect(positionText("crew")).toContain("no matter who is at Front or Reserve");
  });
});
