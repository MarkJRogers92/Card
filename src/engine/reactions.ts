import type { CombatActor } from "./actors";
import type { CombatState } from "./combat";
import {
  applyDirectDamage,
  calculateReactionDamage,
  createDirectDamagePacket,
  gainBlock,
  healActor,
  type DamageResult,
  type HealingResult,
} from "./damage";
import {
  classifyCardPosition,
  type CardCombatOwner,
  type CardPositionClassification,
  type CardResolutionContext,
} from "./duo";
import {
  createImprint,
  ingredientsAreCompatible,
  storeOrReinforceImprint,
  type FormIngredientId,
  type Imprint,
  type Ingredient,
  type MaterialIngredientId,
} from "./imprint";
import {
  scheduleReactionPacket,
  type ScheduledReactionEffect,
} from "./scheduled";
import type { AuthoritativeState } from "./state";
import { applyCombatStatus } from "./status-runtime";

export const REACTION_RECIPE_VERSION = 2 as const;

export type EnemyReactionTarget = "selected_enemy" | "all_enemies";

export type RepeatableReactionEffect =
  | {
      readonly op: "damage";
      readonly coefficient: number;
      readonly hits: number;
      readonly target: "selected_enemy";
    }
  | {
      readonly op: "apply_status";
      readonly status: "bleed" | "poison";
      readonly coefficient: number;
      readonly target: "selected_enemy";
    };

export type ReactionEffect =
  | {
      readonly op: "damage";
      readonly coefficient: number;
      readonly hits: number;
      readonly target: EnemyReactionTarget;
    }
  | {
      readonly op: "apply_status";
      readonly status: "bleed" | "poison";
      readonly coefficient: number;
      readonly target: EnemyReactionTarget;
    }
  | {
      readonly op: "heal";
      readonly coefficient: number;
      readonly target: "front";
    }
  | {
      readonly op: "block";
      readonly coefficient: number;
      readonly target: "front";
    }
  | {
      readonly op: "schedule_repeat";
      readonly timing: "next_player_turn_start";
      readonly effects: readonly RepeatableReactionEffect[];
    };

export interface ReactionRecipe {
  readonly recipeVersion: typeof REACTION_RECIPE_VERSION;
  readonly id: string;
  readonly name: string;
  readonly material: MaterialIngredientId;
  readonly form: FormIngredientId;
  readonly effects: readonly ReactionEffect[];
}

export type NeedleReactionEffect = ReactionEffect;
export type NeedleReactionRecipe = ReactionRecipe;

function recipe(
  id: string,
  name: string,
  material: MaterialIngredientId,
  form: FormIngredientId,
  effects: readonly ReactionEffect[],
): ReactionRecipe {
  return {
    recipeVersion: REACTION_RECIPE_VERSION,
    id,
    name,
    material,
    form,
    effects,
  };
}

export const REACTION_RECIPES: Readonly<
  Record<MaterialIngredientId, Readonly<Record<FormIngredientId, ReactionRecipe>>>
> = {
  gore: {
    needle: recipe("reaction.staple_gun", "Staple Gun", "gore", "needle", [
      { op: "damage", coefficient: 6, hits: 1, target: "selected_enemy" },
      {
        op: "apply_status",
        status: "bleed",
        coefficient: 2,
        target: "selected_enemy",
      },
    ]),
    burst: recipe("reaction.organ_donor", "Organ Donor", "gore", "burst", [
      { op: "damage", coefficient: 3, hits: 1, target: "all_enemies" },
      {
        op: "apply_status",
        status: "bleed",
        coefficient: 1,
        target: "all_enemies",
      },
    ]),
    siphon: recipe("reaction.transfusion", "Transfusion", "gore", "siphon", [
      { op: "damage", coefficient: 4, hits: 1, target: "selected_enemy" },
      { op: "heal", coefficient: 2, target: "front" },
    ]),
    loop: recipe("reaction.second_incision", "Second Incision", "gore", "loop", [
      { op: "damage", coefficient: 4, hits: 1, target: "selected_enemy" },
      {
        op: "apply_status",
        status: "bleed",
        coefficient: 1,
        target: "selected_enemy",
      },
      {
        op: "schedule_repeat",
        timing: "next_player_turn_start",
        effects: [
          { op: "damage", coefficient: 4, hits: 1, target: "selected_enemy" },
          {
            op: "apply_status",
            status: "bleed",
            coefficient: 1,
            target: "selected_enemy",
          },
        ],
      },
    ]),
  },
  volt: {
    needle: recipe(
      "reaction.live_ammunition",
      "Live Ammunition",
      "volt",
      "needle",
      [{ op: "damage", coefficient: 9, hits: 1, target: "selected_enemy" }],
    ),
    burst: recipe("reaction.public_utility", "Public Utility", "volt", "burst", [
      { op: "damage", coefficient: 5, hits: 1, target: "all_enemies" },
    ]),
    siphon: recipe(
      "reaction.power_transfer",
      "Power Transfer",
      "volt",
      "siphon",
      [
        { op: "damage", coefficient: 6, hits: 1, target: "selected_enemy" },
        { op: "block", coefficient: 3, target: "front" },
      ],
    ),
    loop: recipe(
      "reaction.scheduled_outage",
      "Scheduled Outage",
      "volt",
      "loop",
      [
        { op: "damage", coefficient: 5, hits: 1, target: "selected_enemy" },
        {
          op: "schedule_repeat",
          timing: "next_player_turn_start",
          effects: [
            { op: "damage", coefficient: 5, hits: 1, target: "selected_enemy" },
          ],
        },
      ],
    ),
  },
  rot: {
    needle: recipe(
      "reaction.contaminated_sample",
      "Contaminated Sample",
      "rot",
      "needle",
      [
        {
          op: "apply_status",
          status: "poison",
          coefficient: 4,
          target: "selected_enemy",
        },
      ],
    ),
    burst: recipe("reaction.shared_air", "Shared Air", "rot", "burst", [
      {
        op: "apply_status",
        status: "poison",
        coefficient: 2,
        target: "all_enemies",
      },
    ]),
    siphon: recipe(
      "reaction.symbiotic_error",
      "Symbiotic Error",
      "rot",
      "siphon",
      [
        {
          op: "apply_status",
          status: "poison",
          coefficient: 3,
          target: "selected_enemy",
        },
        { op: "heal", coefficient: 1, target: "front" },
      ],
    ),
    loop: recipe(
      "reaction.recurring_infection",
      "Recurring Infection",
      "rot",
      "loop",
      [
        {
          op: "apply_status",
          status: "poison",
          coefficient: 2,
          target: "selected_enemy",
        },
        {
          op: "schedule_repeat",
          timing: "next_player_turn_start",
          effects: [
            {
              op: "apply_status",
              status: "poison",
              coefficient: 2,
              target: "selected_enemy",
            },
          ],
        },
      ],
    ),
  },
  echo: {
    needle: recipe(
      "reaction.duplicate_claim",
      "Duplicate Claim",
      "echo",
      "needle",
      [{ op: "damage", coefficient: 4, hits: 2, target: "selected_enemy" }],
    ),
    burst: recipe(
      "reaction.mass_duplication",
      "Mass Duplication",
      "echo",
      "burst",
      [{ op: "damage", coefficient: 2, hits: 2, target: "all_enemies" }],
    ),
    siphon: recipe(
      "reaction.borrowed_tomorrow",
      "Borrowed Tomorrow",
      "echo",
      "siphon",
      [
        { op: "damage", coefficient: 3, hits: 2, target: "selected_enemy" },
        { op: "heal", coefficient: 1, target: "front" },
      ],
    ),
    loop: recipe(
      "reaction.administrative_recursion",
      "Administrative Recursion",
      "echo",
      "loop",
      [
        { op: "damage", coefficient: 3, hits: 2, target: "selected_enemy" },
        {
          op: "schedule_repeat",
          timing: "next_player_turn_start",
          effects: [
            { op: "damage", coefficient: 3, hits: 2, target: "selected_enemy" },
          ],
        },
      ],
    ),
  },
};

export const NEEDLE_REACTION_RECIPES: Readonly<
  Record<MaterialIngredientId, ReactionRecipe>
> = {
  gore: REACTION_RECIPES.gore.needle,
  volt: REACTION_RECIPES.volt.needle,
  rot: REACTION_RECIPES.rot.needle,
  echo: REACTION_RECIPES.echo.needle,
};

export interface PrimaryReactionResolution {
  readonly recipeId: string;
  readonly recipeName: string;
  readonly potency: number;
  readonly targetActorId: string | null;
  readonly targetActorIds: readonly string[];
  readonly retargeted: boolean;
  readonly fizzled: boolean;
  readonly damageResults: readonly DamageResult[];
  readonly statusesApplied: readonly {
    actorId: string;
    status: "bleed" | "poison";
    amount: number;
  }[];
  readonly healingResults: readonly HealingResult[];
  readonly blockApplied: readonly { actorId: string; amount: number }[];
  readonly scheduledPacketIds: readonly string[];
}

export interface PostCardIngredientInput {
  readonly cardContext: CardResolutionContext;
  readonly ingredient: Ingredient | null;
  readonly selectedEnemyActorId: string | null;
}

export interface PostCardIngredientResolution {
  readonly state: AuthoritativeState;
  readonly classification: CardPositionClassification;
  readonly previousImprint: Imprint | null;
  readonly resultingImprint: Imprint | null;
  readonly reaction: PrimaryReactionResolution | null;
}

function requireCombat(state: AuthoritativeState): CombatState {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  return state.combat;
}

function requireCharacterOwner(owner: CardCombatOwner): string {
  if (owner.kind !== "character") {
    throw new Error("Crew cards cannot own an Imprint.");
  }
  return owner.actorId;
}

function requireEnemy(combat: CombatState, actorId: string): CombatActor {
  const actor = combat.actors[actorId];
  if (actor === undefined || actor.side !== "enemy") {
    throw new Error(`Reaction target ${actorId} is not an enemy.`);
  }
  return actor;
}

function livingEnemyIds(combat: CombatState): readonly string[] {
  return combat.enemySpawnOrder.filter((actorId) => {
    const actor = combat.actors[actorId];
    return actor?.side === "enemy" && actor.hp > 0;
  });
}

function requireFrontCharacterId(combat: CombatState): string {
  if (combat.frontCharacterId === null) {
    throw new Error("Player formation has not been initialized.");
  }
  return combat.frontCharacterId;
}

function resolveReactionTarget(
  combat: CombatState,
  selectedEnemyActorId: string | null,
): { readonly actorId: string | null; readonly retargeted: boolean } {
  if (selectedEnemyActorId === null) {
    throw new Error("This Reaction requires a selected enemy target.");
  }
  const selected = requireEnemy(combat, selectedEnemyActorId);
  if (selected.hp > 0) {
    return { actorId: selectedEnemyActorId, retargeted: false };
  }
  for (const actorId of combat.enemySpawnOrder) {
    const actor = combat.actors[actorId];
    if (actor?.side === "enemy" && actor.hp > 0) {
      return { actorId, retargeted: true };
    }
  }
  return { actorId: null, retargeted: true };
}

function materialAndForm(
  stored: Imprint,
  incoming: Ingredient,
): { readonly material: MaterialIngredientId; readonly form: FormIngredientId } {
  if (stored.ingredient.kind === "material" && incoming.kind === "form") {
    return { material: stored.ingredient.id, form: incoming.id };
  }
  if (stored.ingredient.kind === "form" && incoming.kind === "material") {
    return { material: incoming.id, form: stored.ingredient.id };
  }
  throw new Error("Reaction ingredients are not compatible.");
}

export function resolveReactionRecipe(
  stored: Imprint,
  incoming: Ingredient,
): ReactionRecipe {
  const pair = materialAndForm(stored, incoming);
  return REACTION_RECIPES[pair.material][pair.form];
}

function effectNeedsSelectedEnemy(effect: ReactionEffect): boolean {
  if (effect.op === "schedule_repeat") {
    return effect.effects.some((nested) => nested.target === "selected_enemy");
  }
  if (effect.op === "heal" || effect.op === "block") {
    return false;
  }
  return effect.target === "selected_enemy";
}

function recipeNeedsSelectedEnemy(recipeValue: ReactionRecipe): boolean {
  return recipeValue.effects.some(effectNeedsSelectedEnemy);
}

function reactionAmount(coefficient: number, potency: number): number {
  if (!Number.isSafeInteger(coefficient) || coefficient < 0) {
    throw new RangeError("Reaction coefficient must be a nonnegative safe integer.");
  }
  const result = BigInt(coefficient) * BigInt(potency);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Reaction effect amount exceeds the safe integer range.");
  }
  return Number(result);
}

function repeatPacketEffects(
  effects: readonly RepeatableReactionEffect[],
  potency: number,
  targetActorId: string,
): readonly ScheduledReactionEffect[] {
  return effects.map((effect): ScheduledReactionEffect => {
    if (effect.op === "damage") {
      return {
        op: "reaction_damage",
        amountBeforeTargetModifiers: reactionAmount(effect.coefficient, potency),
        hits: effect.hits,
        targetActorId,
      };
    }
    return {
      op: "apply_status",
      status: effect.status,
      amount: reactionAmount(effect.coefficient, potency),
      targetActorId,
    };
  });
}

function resolvePrimaryReaction(
  state: AuthoritativeState,
  stored: Imprint,
  incoming: Ingredient,
  selectedEnemyActorId: string | null,
): { readonly state: AuthoritativeState; readonly reaction: PrimaryReactionResolution } {
  const recipeValue = resolveReactionRecipe(stored, incoming);
  const initialCombat = requireCombat(state);
  const primaryTarget = recipeNeedsSelectedEnemy(recipeValue)
    ? resolveReactionTarget(initialCombat, selectedEnemyActorId)
    : { actorId: null, retargeted: false };
  let current = state;
  const targetActorIds = new Set<string>();
  const damageResults: DamageResult[] = [];
  const statusesApplied: Array<{
    actorId: string;
    status: "bleed" | "poison";
    amount: number;
  }> = [];
  const healingResults: HealingResult[] = [];
  const blockApplied: Array<{ actorId: string; amount: number }> = [];
  const scheduledPacketIds: string[] = [];

  for (const effect of recipeValue.effects) {
    if (current.combat?.outcome !== "active") {
      break;
    }

    if (effect.op === "heal") {
      const frontCharacterId = requireFrontCharacterId(requireCombat(current));
      const resolution = healActor(
        current,
        frontCharacterId,
        reactionAmount(effect.coefficient, stored.potency),
      );
      current = resolution.state;
      healingResults.push(resolution.result);
      continue;
    }

    if (effect.op === "block") {
      const frontCharacterId = requireFrontCharacterId(requireCombat(current));
      const amount = reactionAmount(effect.coefficient, stored.potency);
      current = gainBlock(current, frontCharacterId, amount);
      blockApplied.push({ actorId: frontCharacterId, amount });
      continue;
    }

    if (effect.op === "schedule_repeat") {
      if (primaryTarget.actorId === null) {
        continue;
      }
      const scheduled = scheduleReactionPacket(
        current,
        recipeValue.id,
        primaryTarget.actorId,
        repeatPacketEffects(effect.effects, stored.potency, primaryTarget.actorId),
      );
      current = scheduled.state;
      scheduledPacketIds.push(scheduled.packet.packetId);
      targetActorIds.add(primaryTarget.actorId);
      continue;
    }

    const targets =
      effect.target === "selected_enemy"
        ? primaryTarget.actorId === null
          ? []
          : [primaryTarget.actorId]
        : [...livingEnemyIds(requireCombat(current))];
    for (const actorId of targets) {
      targetActorIds.add(actorId);
    }

    if (effect.op === "damage") {
      for (let hit = 0; hit < effect.hits; hit += 1) {
        for (const actorId of targets) {
          const target = current.combat?.actors[actorId];
          if (
            current.combat?.outcome !== "active" ||
            target === undefined ||
            target.hp === 0
          ) {
            continue;
          }
          const amount = calculateReactionDamage(
            current.combat,
            actorId,
            effect.coefficient,
            stored.potency,
          ).amount;
          const resolution = applyDirectDamage(
            current,
            actorId,
            createDirectDamagePacket(amount),
          );
          current = resolution.state;
          damageResults.push(...resolution.results);
        }
      }
      continue;
    }

    const amount = reactionAmount(effect.coefficient, stored.potency);
    for (const actorId of targets) {
      const target = current.combat?.actors[actorId];
      if (
        current.combat?.outcome !== "active" ||
        target === undefined ||
        target.hp === 0
      ) {
        continue;
      }
      current = applyCombatStatus(current, actorId, effect.status, amount);
      statusesApplied.push({ actorId, status: effect.status, amount });
    }
  }

  return {
    state: current,
    reaction: {
      recipeId: recipeValue.id,
      recipeName: recipeValue.name,
      potency: stored.potency,
      targetActorId: primaryTarget.actorId,
      targetActorIds: [...targetActorIds],
      retargeted: primaryTarget.retargeted,
      fizzled: targetActorIds.size === 0,
      damageResults,
      statusesApplied,
      healingResults,
      blockApplied,
      scheduledPacketIds,
    },
  };
}

export function resolvePostCardIngredient(
  state: AuthoritativeState,
  input: PostCardIngredientInput,
): PostCardIngredientResolution {
  const combat = requireCombat(state);
  const classification = input.cardContext.classification;
  // Check membership without reclassifying a play after its base effects.
  classifyCardPosition(combat, input.cardContext.owner);
  const previousImprint = combat.imprint;
  if (classification !== "lead" || input.ingredient === null) {
    return {
      state,
      classification,
      previousImprint,
      resultingImprint: previousImprint,
      reaction: null,
    };
  }

  const ownerCharacterId = requireCharacterOwner(input.cardContext.owner);
  const compatibleHandoff =
    previousImprint !== null &&
    previousImprint.ownerCharacterId !== ownerCharacterId &&
    ingredientsAreCompatible(previousImprint.ingredient, input.ingredient);
  let current = state;
  let reaction: PrimaryReactionResolution | null = null;
  if (compatibleHandoff && previousImprint !== null) {
    const resolution = resolvePrimaryReaction(
      current,
      previousImprint,
      input.ingredient,
      input.selectedEnemyActorId,
    );
    current = resolution.state;
    reaction = resolution.reaction;
  }

  if (current.combat?.outcome === "active") {
    current = compatibleHandoff
      ? {
          ...current,
          combat: {
            ...current.combat,
            imprint: createImprint(ownerCharacterId, input.ingredient),
          },
        }
      : storeOrReinforceImprint(current, ownerCharacterId, input.ingredient);
  }

  return {
    state: current,
    classification,
    previousImprint,
    resultingImprint: current.combat?.imprint ?? null,
    reaction,
  };
}
