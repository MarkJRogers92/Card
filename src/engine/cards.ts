import type { JsonValue } from "./canonical";

export const CARD_INSTANCE_VERSION = 1 as const;
const CARD_INSTANCE_ID_WIDTH = 12;

export type CardInstanceId = `card-v${typeof CARD_INSTANCE_VERSION}-${string}`;
export type CardOrigin = "permanent" | "temporary";

export interface CardInstance {
  readonly instanceVersion: typeof CARD_INSTANCE_VERSION;
  readonly instanceId: CardInstanceId;
  readonly definitionId: string;
  readonly ownerCharacterId: string;
  readonly upgradeLevel: number;
  readonly origin: CardOrigin;
  readonly graftData: JsonValue | null;
  readonly instanceModifiers: readonly JsonValue[];
}

export interface CardInstanceInput {
  readonly instanceId: CardInstanceId;
  readonly definitionId: string;
  readonly ownerCharacterId: string;
  readonly upgradeLevel?: number;
  readonly origin?: CardOrigin;
  readonly graftData?: JsonValue | null;
  readonly instanceModifiers?: readonly JsonValue[];
}

function assertNonEmpty(label: string, value: string): void {
  if (value.length === 0) {
    throw new RangeError(`${label} cannot be empty.`);
  }
}

export function createCardInstanceId(ordinal: number): CardInstanceId {
  if (!Number.isSafeInteger(ordinal) || ordinal <= 0) {
    throw new RangeError("Card instance ordinal must be a positive safe integer.");
  }
  return `card-v${CARD_INSTANCE_VERSION}-${ordinal
    .toString(10)
    .padStart(CARD_INSTANCE_ID_WIDTH, "0")}`;
}

export function createCardInstance(input: CardInstanceInput): CardInstance {
  assertNonEmpty("instanceId", input.instanceId);
  assertNonEmpty("definitionId", input.definitionId);
  assertNonEmpty("ownerCharacterId", input.ownerCharacterId);

  const upgradeLevel = input.upgradeLevel ?? 0;
  if (!Number.isSafeInteger(upgradeLevel) || upgradeLevel < 0) {
    throw new RangeError("Card upgradeLevel must be a nonnegative safe integer.");
  }

  return {
    instanceVersion: CARD_INSTANCE_VERSION,
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    ownerCharacterId: input.ownerCharacterId,
    upgradeLevel,
    origin: input.origin ?? "permanent",
    graftData: input.graftData ?? null,
    instanceModifiers: input.instanceModifiers ?? [],
  };
}
