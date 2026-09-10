import {
  resolvePostCardIngredient,
  type PostCardIngredientInput,
  type PostCardIngredientResolution,
} from "./reactions";
import {
  TRIGGER_EVENT_VERSION,
  dispatchTriggerEvent,
} from "./triggers";
import type { AuthoritativeState } from "./state";

export function resolvePostCardIngredientWithTriggers(
  state: AuthoritativeState,
  input: PostCardIngredientInput,
): PostCardIngredientResolution {
  const resolved = resolvePostCardIngredient(state, input);
  const combat = resolved.state.combat;
  if (
    combat === null ||
    combat.outcome !== "active" ||
    combat.triggerBindings.length === 0
  ) {
    return resolved;
  }

  const dispatched = dispatchTriggerEvent(resolved.state, {
    eventVersion: TRIGGER_EVENT_VERSION,
    kind: "card_played",
    cardOwnerActorId:
      input.cardContext.owner.kind === "character"
        ? input.cardContext.owner.actorId
        : null,
    classification: input.cardContext.classification,
    ingredient: input.ingredient,
  });

  return {
    ...resolved,
    state: dispatched.state,
    resultingImprint: dispatched.state.combat?.imprint ?? null,
  };
}
