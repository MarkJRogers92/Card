import type { AuthoritativeState } from "./state";
import {
  TRIGGER_BINDING_VERSION,
  installTriggerBindings,
  type TriggerBinding,
} from "./triggers";

export const MORROW_THICK_BLOOD_SOURCE_ID = "character.morrow" as const;
export const MORROW_THICK_BLOOD_TRIGGER_ID = "thick_blood" as const;
export const SWITCH_OPEN_CHANNEL_SOURCE_ID = "character.switch" as const;
export const SWITCH_OPEN_CHANNEL_TRIGGER_ID = "open_channel" as const;
export const SHARED_WARRANTY_SOURCE_ID = "relic.shared_warranty" as const;
export const SHARED_WARRANTY_TRIGGER_ID = "first_swap_block" as const;

export interface InitialPassiveSetup {
  readonly morrowActorId: string;
  readonly switchActorId: string;
  readonly includeSharedWarranty?: boolean;
}

function assertNonEmpty(label: string, value: string): void {
  if (value.length === 0) {
    throw new RangeError(`${label} cannot be empty.`);
  }
}

export function createInitialPassiveBindings(
  setup: InitialPassiveSetup,
): readonly TriggerBinding[] {
  assertNonEmpty("Morrow actorId", setup.morrowActorId);
  assertNonEmpty("Switch actorId", setup.switchActorId);
  if (setup.morrowActorId === setup.switchActorId) {
    throw new Error("Morrow and Switch must use distinct actor IDs.");
  }

  const bindings: TriggerBinding[] = [
    {
      bindingVersion: TRIGGER_BINDING_VERSION,
      sourceId: MORROW_THICK_BLOOD_SOURCE_ID,
      triggerId: MORROW_THICK_BLOOD_TRIGGER_ID,
      sourceActorId: setup.morrowActorId,
      event: "card_played",
      conditions: [
        { kind: "card_owner", actorId: setup.morrowActorId },
        { kind: "classification", value: "lead" },
        {
          kind: "ingredient",
          ingredient: { kind: "material", id: "gore", prime: 1 },
        },
      ],
      effects: [{ op: "gain_block", target: "source_actor", amount: 2 }],
      limit: { scope: "turn", count: 1 },
      priority: 100,
    },
    {
      bindingVersion: TRIGGER_BINDING_VERSION,
      sourceId: SWITCH_OPEN_CHANNEL_SOURCE_ID,
      triggerId: SWITCH_OPEN_CHANNEL_TRIGGER_ID,
      sourceActorId: setup.switchActorId,
      event: "card_played",
      conditions: [
        { kind: "card_owner", actorId: setup.switchActorId },
        { kind: "classification", value: "lead" },
        { kind: "has_ingredient" },
      ],
      effects: [{ op: "draw", amount: 1 }],
      limit: { scope: "turn", count: 1 },
      priority: 100,
    },
  ];

  if (setup.includeSharedWarranty ?? true) {
    bindings.push({
      bindingVersion: TRIGGER_BINDING_VERSION,
      sourceId: SHARED_WARRANTY_SOURCE_ID,
      triggerId: SHARED_WARRANTY_TRIGGER_ID,
      sourceActorId: null,
      event: "after_swap",
      conditions: [],
      effects: [{ op: "gain_block", target: "incoming_front", amount: 3 }],
      limit: { scope: "turn", count: 1 },
      priority: 100,
    });
  }

  return bindings;
}

export function installInitialPassives(
  state: AuthoritativeState,
  setup: InitialPassiveSetup,
): AuthoritativeState {
  const combat = state.combat;
  if (combat === null || combat.outcome !== "active") {
    throw new Error("Initial passives require an active combat.");
  }
  if (combat.phase !== "setup") {
    throw new Error("Initial passives must be installed during combat setup.");
  }
  const morrow = combat.actors[setup.morrowActorId];
  const switchActor = combat.actors[setup.switchActorId];
  if (morrow?.side !== "player" || switchActor?.side !== "player") {
    throw new Error("Morrow and Switch passive bindings require player actors.");
  }
  return installTriggerBindings(state, createInitialPassiveBindings(setup));
}
