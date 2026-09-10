import type { AuthoritativeState } from "./state";

export const IMPRINT_STATE_VERSION = 1 as const;
export const MAX_IMPRINT_POTENCY = 3 as const;

export const MATERIAL_INGREDIENT_IDS = ["gore", "volt", "rot", "echo"] as const;
export const FORM_INGREDIENT_IDS = ["needle", "burst", "siphon", "loop"] as const;

export type MaterialIngredientId = (typeof MATERIAL_INGREDIENT_IDS)[number];
export type FormIngredientId = (typeof FORM_INGREDIENT_IDS)[number];

export type Ingredient =
  | {
      readonly kind: "material";
      readonly id: MaterialIngredientId;
      readonly prime: number;
    }
  | {
      readonly kind: "form";
      readonly id: FormIngredientId;
      readonly prime: number;
    };

export type ImprintIngredient =
  | { readonly kind: "material"; readonly id: MaterialIngredientId }
  | { readonly kind: "form"; readonly id: FormIngredientId };

export interface Imprint {
  readonly imprintVersion: typeof IMPRINT_STATE_VERSION;
  readonly ownerCharacterId: string;
  readonly ingredient: ImprintIngredient;
  readonly potency: number;
}

function assertPrime(prime: number): void {
  if (!Number.isSafeInteger(prime) || prime <= 0) {
    throw new RangeError("Ingredient Prime must be a positive safe integer.");
  }
}

function requireCombat(state: AuthoritativeState) {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  return state.combat;
}

export function createImprint(
  ownerCharacterId: string,
  ingredient: Ingredient,
): Imprint {
  if (ownerCharacterId.length === 0) {
    throw new RangeError("Imprint ownerCharacterId cannot be empty.");
  }
  assertPrime(ingredient.prime);
  const validId =
    ingredient.kind === "material"
      ? MATERIAL_INGREDIENT_IDS.includes(ingredient.id)
      : FORM_INGREDIENT_IDS.includes(ingredient.id);
  if (!validId) {
    throw new Error(
      `Ingredient ${String(ingredient.id)} does not belong to ${ingredient.kind}.`,
    );
  }
  return {
    imprintVersion: IMPRINT_STATE_VERSION,
    ownerCharacterId,
    ingredient:
      ingredient.kind === "material"
        ? { kind: "material", id: ingredient.id }
        : { kind: "form", id: ingredient.id },
    potency: Math.min(MAX_IMPRINT_POTENCY, ingredient.prime),
  };
}

export function storeOrReinforceImprint(
  state: AuthoritativeState,
  ownerCharacterId: string,
  ingredient: Ingredient,
): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.outcome !== "active") {
    return state;
  }
  assertPrime(ingredient.prime);
  const current = combat.imprint;
  const sameIngredient =
    current !== null &&
    current.ownerCharacterId === ownerCharacterId &&
    current.ingredient.kind === ingredient.kind &&
    current.ingredient.id === ingredient.id;
  const imprint = sameIngredient
    ? {
        ...current,
        potency: Math.min(MAX_IMPRINT_POTENCY, current.potency + ingredient.prime),
      }
    : createImprint(ownerCharacterId, ingredient);
  return { ...state, combat: { ...combat, imprint } };
}

export function ingredientsAreCompatible(
  stored: Imprint["ingredient"],
  incoming: Ingredient,
): boolean {
  return stored.kind !== incoming.kind;
}
