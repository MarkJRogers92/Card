import type { CombatActor } from "./actors";
import type { CombatState } from "./combat";
import {
  applyDirectDamage,
  calculateReactionDamage,
  createDirectDamagePacket,
  type DamageResult,
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
import type { AuthoritativeState } from "./state";
import { applyCombatStatus } from "./status-runtime";

export const REACTION_RECIPE_VERSION = 1 as const;

export type NeedleReactionEffect =
  | {
      readonly op: "damage";
      readonly coefficient: number;
      readonly hits: number;
    }
  | {
      readonly op: "apply_status";
      readonly status: "bleed" | "poison";
      readonly coefficient: number;
    };

export interface NeedleReactionRecipe {
  readonly recipeVersion: typeof REACTION_RECIPE_VERSION;
  readonly id: string;
  readonly name: string;
  readonly material: MaterialIngredientId;
  readonly form: "needle";
  readonly effects: readonly NeedleReactionEffect[];
}

export const NEEDLE_REACTION_RECIPES: Readonly<
  Record<MaterialIngredientId, NeedleReactionRecipe>
> = {
  gore: {
    recipeVersion: REACTION_RECIPE_VERSION,
    id: "reaction.staple_gun",
    name: "Staple Gun",
    material: "gore",
    form: "needle",
    effects: [
      { op: "damage", coefficient: 6, hits: 1 },
      { op: "apply_status", status: "bleed", coefficient: 2 },
    ],
  },
  volt: {
    recipeVersion: REACTION_RECIPE_VERSION,
    id: "reaction.live_ammunition",
    name: "Live Ammunition",
    material: "volt",
    form: "needle",
    effects: [{ op: "damage", coefficient: 9, hits: 1 }],
  },
  rot: {
    recipeVersion: REACTION_RECIPE_VERSION,
    id: "reaction.contaminated_sample",
    name: "Contaminated Sample",
    material: "rot",
    form: "needle",
    effects: [{ op: "apply_status", status: "poison", coefficient: 4 }],
  },
  echo: {
    recipeVersion: REACTION_RECIPE_VERSION,
    id: "reaction.duplicate_claim",
    name: "Duplicate Claim",
    material: "echo",
    form: "needle",
    effects: [{ op: "damage", coefficient: 4, hits: 2 }],
  },
};

export interface PrimaryReactionResolution {
  readonly recipeId: string;
  readonly recipeName: string;
  readonly potency: number;
  readonly targetActorId: string | null;
  readonly retargeted: boolean;
  readonly fizzled: boolean;
  readonly damageResults: readonly DamageResult[];
  readonly statusesApplied: readonly {
    actorId: string;
    status: "bleed" | "poison";
    amount: number;
  }[];
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

function resolveReactionTarget(
  combat: CombatState,
  selectedEnemyActorId: string | null,
): { readonly actorId: string | null; readonly retargeted: boolean } {
  if (selectedEnemyActorId === null) {
    throw new Error("A Needle Reaction requires a selected enemy target.");
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

function resolveNeedleRecipe(
  stored: Imprint,
  incoming: Ingredient,
): NeedleReactionRecipe {
  const pair = materialAndForm(stored, incoming);
  if (pair.form !== "needle") {
    throw new Error(`Reaction form ${pair.form} is not implemented until M08.`);
  }
  return NEEDLE_REACTION_RECIPES[pair.material];
}

function resolveNeedleReaction(
  state: AuthoritativeState,
  stored: Imprint,
  incoming: Ingredient,
  selectedEnemyActorId: string | null,
): { readonly state: AuthoritativeState; readonly reaction: PrimaryReactionResolution } {
  const recipe = resolveNeedleRecipe(stored, incoming);
  const target = resolveReactionTarget(requireCombat(state), selectedEnemyActorId);
  let current = state;
  const damageResults: DamageResult[] = [];
  const statusesApplied: Array<{
    actorId: string;
    status: "bleed" | "poison";
    amount: number;
  }> = [];

  if (target.actorId !== null) {
    for (const effect of recipe.effects) {
      const currentTarget = current.combat?.actors[target.actorId];
      if (current.combat?.outcome !== "active" || currentTarget?.hp === 0) {
        break;
      }
      if (effect.op === "damage") {
        for (let hit = 0; hit < effect.hits; hit += 1) {
          const hitTarget = current.combat?.actors[target.actorId];
          if (current.combat?.outcome !== "active" || hitTarget?.hp === 0) {
            break;
          }
          const combat = requireCombat(current);
          const amount = calculateReactionDamage(
            combat,
            target.actorId,
            effect.coefficient,
            stored.potency,
          ).amount;
          const resolution = applyDirectDamage(
            current,
            target.actorId,
            createDirectDamagePacket(amount),
          );
          current = resolution.state;
          damageResults.push(...resolution.results);
        }
      } else {
        const amount = effect.coefficient * stored.potency;
        current = applyCombatStatus(current, target.actorId, effect.status, amount);
        statusesApplied.push({
          actorId: target.actorId,
          status: effect.status,
          amount,
        });
      }
    }
  }

  return {
    state: current,
    reaction: {
      recipeId: recipe.id,
      recipeName: recipe.name,
      potency: stored.potency,
      targetActorId: target.actorId,
      retargeted: target.retargeted,
      fizzled: target.actorId === null,
      damageResults,
      statusesApplied,
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
    const resolution = resolveNeedleReaction(
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
