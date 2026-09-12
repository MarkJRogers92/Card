import type { CardDefinition, CommonSchema, Effect } from "../content/generated";
import type { Ingredient } from "./imprint";
import type { M10CardEffect, M10StarterCardDefinition } from "./m10-fight";

// This module is the single source of player-facing card text. It derives a
// one-line summary plus labelled detail rows from validated content data, so a
// new card (or a new effect operation) explains itself without hand-authored
// strings and without any card-ID branch anywhere in the engine or the UI.
//
// It is pure: it reads a definition and returns strings. It never mutates state
// and never inspects hidden information (see docs/DESIGN.md 7.6).

export const CARD_TEXT_VERSION = 1 as const;

export interface CardTextLine {
  readonly label: string;
  readonly text: string;
}

export interface CardExplanation {
  readonly summary: string;
  readonly lines: readonly CardTextLine[];
}

export type CardKeywordText = CommonSchema.Keyword;
export type CardValueSource = ReadonlyMap<string, number>;

// Rule text mirrors the keyword table in docs/DESIGN.md 2.9. Keep the wording
// short enough for a popup but faithful to the exact rule.
export const CARD_KEYWORD_GLOSSARY: Readonly<Record<CardKeywordText, string>> = {
  exhaust: "After being played, the card leaves the combat deck until combat ends.",
  retain: "The card stays in hand at player-turn end instead of being discarded.",
  fleeting: "If unplayed at player-turn end, the card Exhausts.",
  unplayable: "Cannot be played normally; another effect must remove or upgrade it.",
  protocol: "Installs a combat-long passive and moves to the deployed zone. It is not replayed on reshuffle.",
  liability: "Liability: a deferred penalty this card leaves behind for the run.",
};

const EFFECT_TARGET_LABELS: Readonly<Record<CommonSchema.EffectTarget, string>> = {
  selected_enemy: "the selected enemy",
  all_enemies: "all enemies",
  front: "the Front character",
  reserve: "the Reserve character",
  both: "both characters",
  locked_character: "the Locked character",
  self: "the acting character",
  owner: "the card's owner",
  intent_target: "the enemy's target",
  none: "no target",
};

const CARD_TARGET_LABELS: Readonly<Record<CommonSchema.CardTarget, string>> = {
  enemy: "the selected enemy",
  all_enemies: "all enemies",
  self: "the acting character",
  owner: "the card's owner",
  front: "the Front character",
  reserve: "the Reserve character",
  both: "both characters",
  none: "no target",
};

const STAT_LABELS: Readonly<Record<CommonSchema.StatReference, string>> = {
  owner_hp: "this character's HP",
  owner_max_hp: "this character's max HP",
  front_hp: "the Front character's HP",
  front_max_hp: "the Front character's max HP",
  reserve_hp: "the Reserve character's HP",
  reserve_max_hp: "the Reserve character's max HP",
  energy: "your Energy",
  imprint_potency: "the Imprint's Potency",
  enemy_hp: "the selected enemy's HP",
  enemy_max_hp: "the selected enemy's max HP",
  scrap: "your Scrap",
  evidence: "your Evidence",
};

const COST_RESOURCE_LABELS: Readonly<Record<CommonSchema.CostResource, string>> = {
  owner_hp: "HP from this character",
  front_hp: "HP from the Front character",
  reserve_hp: "HP from the Reserve character",
  scrap: "Scrap",
  evidence: "Evidence",
  energy: "Energy",
};

const DESTINATION_LABELS: Readonly<Record<CommonSchema.Destination, string>> = {
  player_hand: "hand",
  player_discard: "discard pile",
  player_draw: "draw pile",
  player_exhaust: "exhaust pile",
  deployed: "deployed zone",
};

const TIMING_LABELS: Readonly<Record<CommonSchema.EffectTiming, string>> = {
  next_player_turn_start: "next player turn start",
  next_enemy_phase_start: "next enemy phase start",
};

const PROTOCOL_EVENT_LABELS: Readonly<Record<EffectSchemaProtocolEvent, string>> = {
  after_source_lead: "respond to the Source playing a Lead card",
  after_primary_reaction: "respond to a primary Reaction",
  after_swap: "respond to a swap",
  player_turn_start: "fire at player-turn start",
  enemy_phase_start: "fire at enemy-phase start",
};

type EffectSchemaProtocolEvent = Extract<
  Effect,
  { op: "install_protocol" }
>["trigger"]["event"];

const INGREDIENT_LABELS: Readonly<Record<Ingredient["id"], string>> = {
  gore: "Gore",
  volt: "Volt",
  rot: "Rot",
  echo: "Echo",
  needle: "Needle",
  burst: "Burst",
  siphon: "Siphon",
  loop: "Loop",
};

const STATUS_LABELS: Readonly<Record<CommonSchema.StatusId, string>> = {
  bleed: "Bleed",
  poison: "Poison",
  weak: "Weak",
  exposed: "Exposed",
  strength: "Strength",
};

function assertNever(value: never, context: string): never {
  throw new Error(`Unsupported ${context} for card text: ${JSON.stringify(value)}.`);
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

/**
 * Renders a value expression as exact text when the parameters are known, and
 * falls back to readable symbolic text when they are not (for example a
 * scaling value that depends on state at play time).
 */
function valueText(
  expr: CommonSchema.ValueExpr,
  values: CardValueSource,
): string {
  if ("const" in expr) {
    return String(expr.const);
  }
  if ("param" in expr) {
    const value = values.get(expr.param);
    return value === undefined ? `X (${expr.param})` : String(value);
  }
  if ("stat" in expr) {
    return STAT_LABELS[expr.stat];
  }
  if ("add" in expr) {
    return `${valueText(expr.add[0] as CommonSchema.ValueExpr, values)} + ${valueText(
      expr.add[1] as CommonSchema.ValueExpr,
      values,
    )}`;
  }
  if ("multiply" in expr) {
    return `${valueText(expr.multiply[0] as CommonSchema.ValueExpr, values)} x ${valueText(
      expr.multiply[1] as CommonSchema.ValueExpr,
      values,
    )}`;
  }
  return assertNever(expr, "value expression");
}

function targetText(target: CommonSchema.EffectTarget): string {
  return EFFECT_TARGET_LABELS[target];
}

function blockPhrase(target: CommonSchema.EffectTarget, value: string): string {
  if (target === "owner" || target === "self") {
    return `Gain ${value} Block.`;
  }
  return `Gain ${value} Block on ${targetText(target)}.`;
}

function damagePhrase(
  amount: string,
  target: CommonSchema.EffectTarget,
  hits: number,
  category: "attack" | "reaction" | "direct" | "status",
): string {
  const times = hits > 1 ? ` ${hits} times` : "";
  if (category === "direct") {
    return `Deal ${amount} damage to ${targetText(target)}${times}, ignoring Block.`;
  }
  if (category === "status") {
    return `Deal ${amount} status damage to ${targetText(target)}${times}.`;
  }
  return `Deal ${amount} damage to ${targetText(target)}${times}.`;
}

function conditionText(condition: CommonSchema.Condition): string {
  if (condition.target_has_status !== undefined) {
    return `the target has ${STATUS_LABELS[condition.target_has_status]}`;
  }
  if (condition.source_owner !== undefined) {
    return `the acting character is ${condition.source_owner === "crew" ? "Crew" : condition.source_owner}`;
  }
  if (condition.ingredient !== undefined) {
    return `the Imprint holds ${INGREDIENT_LABELS[condition.ingredient.id]}`;
  }
  if (condition.event !== undefined) {
    return `the event is ${condition.event}`;
  }
  if (condition.has_card_tag !== undefined) {
    return `the card is tagged ${condition.has_card_tag}`;
  }
  throw new Error(`Unsupported trigger condition: ${JSON.stringify(condition)}.`);
}

function packetText(
  effects: readonly Effect[],
  values: CardValueSource,
): string {
  return effects.map((effect) => describeEffect(effect, values)).join(" ");
}

function percent(multiplierBps: number): string {
  const whole = multiplierBps / 100;
  return Number.isInteger(whole) ? `${whole}%` : `${multiplierBps / 100}%`;
}

/**
 * One sentence for one schema effect. Exhaustive by construction: adding a new
 * effect operation to the schema fails the type check here until it is
 * described, so a card can never ship with silent rules text.
 */
export function describeEffect(
  effect: Effect,
  values: CardValueSource = new Map<string, number>(),
): string {
  switch (effect.op) {
    case "damage":
      return damagePhrase(
        valueText(effect.amount, values),
        effect.target,
        effect.hits,
        effect.category,
      );
    case "block":
      return blockPhrase(effect.target, valueText(effect.amount, values));
    case "heal":
      return `Heal ${valueText(effect.amount, values)} HP on ${targetText(effect.target)}.`;
    case "apply_status":
      return `Apply ${valueText(effect.amount, values)} ${STATUS_LABELS[effect.status]} to ${targetText(
        effect.target,
      )}.`;
    case "draw": {
      const amount = valueText(effect.amount, values);
      const numeric = Number(amount);
      return `Draw ${amount} ${numeric === 1 ? "card" : "cards"}.`;
    }
    case "gain_energy":
      return `Gain ${valueText(effect.amount, values)} Energy.`;
    case "swap":
      return effect.mode === "free"
        ? "Swap characters without spending Energy."
        : "Swap characters, paying the normal swap cost.";
    case "boost_imprint":
      return `Increase the stored Imprint's Potency by ${valueText(effect.amount, values)}.`;
    case "add_card":
      return `Add ${effect.cardId} to the ${DESTINATION_LABELS[effect.destination]}${
        effect.temporary ? " as a temporary card" : ""
      }.`;
    case "install_protocol": {
      const trigger = effect.trigger;
      const limit = `${trigger.limit.count} per ${trigger.limit.scope}`;
      return `Install a Protocol that will ${PROTOCOL_EVENT_LABELS[trigger.event]} while ${conditionText(
        trigger.filter,
      )} (limit ${limit}): ${packetText(trigger.effects, values)}`;
    }
    case "schedule_packet":
      return `At the ${TIMING_LABELS[effect.timing]}, resolve: ${packetText(effect.packet.effects, values)}`;
    case "repeat_packet":
      return `Repeat ${effect.packetRef} ${effect.multiplier} ${plural(
        effect.multiplier,
        "time",
      )} at the ${TIMING_LABELS[effect.timing]}.`;
    case "repeat_reaction_packet":
      return `Repeat the triggering Reaction at ${percent(effect.multiplierBps)} power.`;
    case "reduce_card_cost":
      return `Reduce a card's Energy cost by ${valueText(effect.amount, values)}.`;
    case "repeat_scheduled_packet":
      return `Repeat each scheduled packet at ${percent(effect.multiplierBps)} power.`;
    case "gain_scrap":
      return `Gain ${valueText(effect.amount, values)} Scrap.`;
    case "gain_evidence":
      return `Gain ${valueText(effect.amount, values)} Evidence.`;
    case "change_standing":
      return `Change ${effect.factionId} standing by ${effect.amount}.`;
    case "set_flag":
      return `Record the "${effect.flagId}" run flag as ${String(effect.value)}.`;
    case "remove_card":
      return "Remove the chosen card from the deck permanently.";
    case "upgrade_card":
      return "Upgrade the chosen card permanently.";
    default:
      return assertNever(effect, "effect operation");
  }
}

/** One sentence for one M10 starter-card effect. */
export function describeM10StarterEffect(effect: M10CardEffect): string {
  switch (effect.op) {
    case "damage":
      return damagePhrase(String(effect.amount), effect.target, 1, "attack");
    case "block_owner":
      return blockPhrase("owner", String(effect.amount));
    case "block_both":
      return `Gain ${effect.amount} Block on both characters.`;
    case "swap_free":
      return "Swap characters without spending Energy.";
    default:
      return assertNever(effect, "M10 starter effect operation");
  }
}

export function ingredientPhrase(ingredient: Ingredient): string {
  const kind = ingredient.kind === "material" ? "Material" : "Form";
  return `${INGREDIENT_LABELS[ingredient.id]} · Prime ${ingredient.prime} (${kind})`;
}

/** Exact keyword rule text, or null for an unknown keyword. */
export function keywordText(keyword: string): string | null {
  return keyword in CARD_KEYWORD_GLOSSARY
    ? CARD_KEYWORD_GLOSSARY[keyword as CardKeywordText]
    : null;
}

/** Why a card is Lead, Support, or Crew right now (docs/DESIGN.md 2.4). */
export function positionText(classification: "lead" | "support" | "crew"): string {
  if (classification === "lead") {
    return "Lead: this card's owner is at Front, so it stores or strengthens the shared Imprint.";
  }
  if (classification === "support") {
    return "Support: this card's owner is in Reserve, so it plays its base effects but stores no Imprint and triggers no Reaction.";
  }
  return "Crew: playable no matter who is at Front or Reserve.";
}

function parameterValues(
  definition: CardDefinition,
  upgraded: boolean,
): CardValueSource {
  const values = new Map<string, number>();
  for (const [name, parameter] of Object.entries(definition.parameters ?? {})) {
    values.set(name, upgraded ? parameter.upgraded : parameter.base);
  }
  return values;
}

function costLines(
  energyCost: string,
  additionalCosts: readonly CommonSchema.Cost[],
  values: CardValueSource,
): readonly CardTextLine[] {
  const lines: CardTextLine[] = [
    { label: "Cost", text: `${energyCost} Energy` },
  ];
  for (const cost of additionalCosts) {
    lines.push({
      label: "Additional cost",
      text: `${valueText(cost.amount, values)} ${COST_RESOURCE_LABELS[cost.resource]}`,
    });
  }
  return lines;
}

function effectLines(sentences: readonly string[]): readonly CardTextLine[] {
  return sentences.map((text, index) => ({
    label: index === 0 ? "Base effect" : "Also",
    text,
  }));
}

function destinationLine(destination: "discard" | "exhaust"): CardTextLine {
  return destination === "exhaust"
    ? { label: "After play", text: "Exhausts: it leaves the combat deck until combat ends." }
    : { label: "After play", text: "Discards." };
}

/**
 * Full explanation for a schema-defined card: one summary sentence plus the
 * detail rows a card popup renders.
 */
export function describeContentCard(
  definition: CardDefinition,
  options: { readonly upgraded?: boolean } = {},
): CardExplanation {
  const upgraded = options.upgraded ?? false;
  const values = parameterValues(definition, upgraded);
  const sentences = definition.effects.map((effect) => describeEffect(effect, values));
  const lines: CardTextLine[] = [
    ...costLines(
      valueText(definition.energyCost, values),
      definition.additionalCosts,
      values,
    ),
    { label: "Family", text: familyText(definition.owner) },
    { label: "Target", text: CARD_TARGET_LABELS[definition.target] },
  ];
  if (definition.ingredient !== null) {
    lines.push({
      label: "Ingredient",
      text: `${INGREDIENT_LABELS[definition.ingredient.id]} · Prime ${valueText(
        definition.ingredient.prime,
        values,
      )} (${definition.ingredient.kind === "material" ? "Material" : "Form"})`,
    });
  }
  lines.push(...effectLines(sentences));
  lines.push({
    label: "After play",
    text: destinationForKeywords(definition.keywords),
  });
  for (const keyword of definition.keywords) {
    const text = keywordText(keyword);
    if (text !== null) {
      lines.push({ label: keywordLabel(keyword), text });
    }
  }
  return {
    summary: upgradeSuffix(sentences.join(" "), upgraded),
    lines,
  };
}

/** Full explanation for an M10 starter card. */
export function describeM10StarterCard(
  definition: M10StarterCardDefinition,
): CardExplanation {
  const sentences = definition.effects.map(describeM10StarterEffect);
  const lines: CardTextLine[] = [
    { label: "Cost", text: `${definition.energyCost} Energy` },
    { label: "Family", text: familyText(definition.owner) },
  ];
  if (definition.ingredient !== null) {
    lines.push({
      label: "Ingredient",
      text: ingredientPhrase(definition.ingredient),
    });
  }
  lines.push(...effectLines(sentences));
  lines.push(destinationLine(definition.destinationAfterPlay));
  return { summary: sentences.join(" "), lines };
}

/** Explanation for a card in the hand that this act cannot play. */
export function describeUnplayableCard(definitionId: string): CardExplanation {
  const summary = "Not playable in this checkpoint.";
  return {
    summary,
    lines: [
      { label: "Card", text: definitionId },
      {
        label: "Why",
        text: "Only the starter deck is playable in this test act; this card waits for the deck and run systems that own it.",
      },
    ],
  };
}

function familyText(owner: string): string {
  if (owner === "morrow" || owner === "source") return "Source";
  if (owner === "switch" || owner === "shaper") return "Shaper";
  return "Crew";
}

function keywordLabel(keyword: string): string {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

function destinationForKeywords(keywords: readonly string[]): string {
  if (keywords.includes("protocol")) {
    return "Moves to the deployed zone and is not replayed on reshuffle.";
  }
  if (keywords.includes("exhaust")) {
    return "Exhausts: it leaves the combat deck until combat ends.";
  }
  return "Discards.";
}

function upgradeSuffix(summary: string, upgraded: boolean): string {
  return upgraded ? `Upgraded — ${summary}` : summary;
}
