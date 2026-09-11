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

  // A primary Reaction is itself part of the completed card play, so its
  // trigger dispatches first; card_played then represents the overall play
  // having finished. Neither event can observe a Protocol installed by this
  // same card, since that installation happens later in finishCardPlayLifecycle.
  let current = resolved.state;
  if (resolved.reaction !== null && combat.frontCharacterId !== null) {
    const bleedTargetActorIds = [
      ...new Set(
        resolved.reaction.statusesApplied
          .filter((applied) => applied.status === "bleed")
          .map((applied) => applied.actorId),
      ),
    ];
    current = dispatchTriggerEvent(current, {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "primary_reaction",
      frontActorId: combat.frontCharacterId,
      bleedTargetActorIds,
      largestDirectDamage: resolved.reaction.largestDirectDamage,
    }).state;
  }
  if (current.combat === null || current.combat.outcome !== "active") {
    return { ...resolved, state: current, resultingImprint: current.combat?.imprint ?? null };
  }

  const dispatched = dispatchTriggerEvent(current, {
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
