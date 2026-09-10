export const ACTOR_STATE_VERSION = 1 as const;

export type ActorSide = "player" | "enemy";

export interface CombatActor {
  readonly actorVersion: typeof ACTOR_STATE_VERSION;
  readonly actorId: string;
  readonly side: ActorSide;
  readonly maxHp: number;
  readonly hp: number;
  readonly block: number;
}

export interface ActorVitalityInput {
  readonly actorId: string;
  readonly maxHp: number;
  readonly hp?: number;
  readonly block?: number;
}

function assertNonEmpty(label: string, value: string): void {
  if (value.length === 0) {
    throw new RangeError(`${label} cannot be empty.`);
  }
}

function assertNonnegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`);
  }
}

export function createCombatActor(
  input: ActorVitalityInput,
  side: ActorSide,
): CombatActor {
  assertNonEmpty("actorId", input.actorId);
  if (!Number.isSafeInteger(input.maxHp) || input.maxHp <= 0) {
    throw new RangeError("maxHp must be a positive safe integer.");
  }

  const hp = input.hp ?? input.maxHp;
  assertNonnegativeInteger("hp", hp);
  if (hp > input.maxHp) {
    throw new RangeError("hp cannot exceed maxHp.");
  }

  const block = input.block ?? 0;
  assertNonnegativeInteger("block", block);

  return {
    actorVersion: ACTOR_STATE_VERSION,
    actorId: input.actorId,
    side,
    maxHp: input.maxHp,
    hp,
    block,
  };
}
