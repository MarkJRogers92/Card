import {
  resolvePostCardIngredient,
  type PostCardIngredientInput,
  type PostCardIngredientResolution,
} from "./reactions";
import {
  applyImprintReinforcementRelics,
  applyPrimaryReactionRelics,
} from "./relic-runtime";
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
  let current = resolved.state;
  const combat = current.combat;
  if (combat === null || combat.outcome !== "active") {
    return resolved;
  }

  if (
    resolved.classification === "lead" &&
    resolved.reaction === null &&
    input.ingredient !== null &&
    input.cardContext.owner.kind === "character"
  ) {
    current = applyImprintReinforcementRelics(current, {
      previousImprint: resolved.previousImprint,
      ownerCharacterId: input.cardContext.owner.actorId,
      ingredient: input.ingredient,
    });
  }

  if (current.combat?.triggerBindings.length === 0 && resolved.reaction === null) {
    return {
      ...resolved,
      state: current,
      resultingImprint: current.combat?.imprint ?? null,
    };
  }

  // A primary Reaction is itself part of the completed card play, so its
  // existing trigger dispatches first. M15's data-defined Reaction relic
  // hooks then resolve against the completed primary Reaction before the
  // overall card_played event. Protocol installation still happens later in
  // finishCardPlayLifecycle, so a newly deployed Protocol cannot observe the
  // card that installed it.
  let reaction = resolved.reaction;
  if (
    reaction !== null &&
    current.combat !== null &&
    current.combat.outcome === "active" &&
    current.combat.frontCharacterId !== null
  ) {
    const bleedTargetActorIds = [
      ...new Set(
        reaction.statusesApplied
          .filter((applied) => applied.status === "bleed")
          .map((applied) => applied.actorId),
      ),
    ];
    if (current.combat.triggerBindings.length > 0) {
      current = dispatchTriggerEvent(current, {
        eventVersion: TRIGGER_EVENT_VERSION,
        kind: "primary_reaction",
        frontActorId: current.combat.frontCharacterId,
        bleedTargetActorIds,
        largestDirectDamage: reaction.largestDirectDamage,
      }).state;
    }
    if (current.combat?.outcome === "active") {
      const relics = applyPrimaryReactionRelics(current, reaction);
      current = relics.state;
      if (relics.additionalScheduledPacketIds.length > 0) {
        reaction = {
          ...reaction,
          scheduledPacketIds: [
            ...reaction.scheduledPacketIds,
            ...relics.additionalScheduledPacketIds,
          ],
        };
      }
    }
  }

  if (current.combat === null || current.combat.outcome !== "active") {
    return {
      ...resolved,
      reaction,
      state: current,
      resultingImprint: current.combat?.imprint ?? null,
    };
  }

  if (current.combat.triggerBindings.length > 0) {
    current = dispatchTriggerEvent(current, {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "card_played",
      cardOwnerActorId:
        input.cardContext.owner.kind === "character"
          ? input.cardContext.owner.actorId
          : null,
      classification: input.cardContext.classification,
      ingredient: input.ingredient,
    }).state;
  }

  return {
    ...resolved,
    reaction,
    state: current,
    resultingImprint: current.combat?.imprint ?? null,
  };
}
