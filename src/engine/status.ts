export const STATUS_STATE_VERSION = 1 as const;

export const COMBAT_STATUS_IDS = [
  "bleed",
  "poison",
  "weak",
  "exposed",
  "strength",
] as const;

export type CombatStatusId = (typeof COMBAT_STATUS_IDS)[number];

export interface CombatStatuses {
  readonly bleed: number;
  readonly poison: number;
  readonly weak: number;
  readonly exposed: number;
  readonly strength: number;
}

export type CombatStatusInput = Partial<Record<CombatStatusId, number>>;

function assertNonnegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`);
  }
}

function assertKnownStatusKey(key: string): asserts key is CombatStatusId {
  if (!(COMBAT_STATUS_IDS as readonly string[]).includes(key)) {
    throw new Error(`Unknown combat status: ${key}.`);
  }
}

export function createCombatStatuses(
  input: CombatStatusInput = {},
): CombatStatuses {
  for (const [key, value] of Object.entries(input)) {
    assertKnownStatusKey(key);
    if (value === undefined) {
      continue;
    }
    assertNonnegativeInteger(`Status ${key}`, value);
  }

  return {
    bleed: input.bleed ?? 0,
    poison: input.poison ?? 0,
    weak: input.weak ?? 0,
    exposed: input.exposed ?? 0,
    strength: input.strength ?? 0,
  };
}

export function getStatusAmount(
  statuses: CombatStatuses,
  status: CombatStatusId,
): number {
  return statuses[status];
}

export function addStatusAmount(
  statuses: CombatStatuses,
  status: CombatStatusId,
  amount: number,
): CombatStatuses {
  assertNonnegativeInteger(`Status ${status} addition`, amount);
  const nextAmount = statuses[status] + amount;
  if (!Number.isSafeInteger(nextAmount)) {
    throw new RangeError(`Status ${status} exceeds the safe integer range.`);
  }
  return { ...statuses, [status]: nextAmount };
}

export function setStatusAmount(
  statuses: CombatStatuses,
  status: CombatStatusId,
  amount: number,
): CombatStatuses {
  assertNonnegativeInteger(`Status ${status}`, amount);
  return { ...statuses, [status]: amount };
}

export function decrementStatusAmount(
  statuses: CombatStatuses,
  status: CombatStatusId,
  amount = 1,
): CombatStatuses {
  assertNonnegativeInteger(`Status ${status} decrement`, amount);
  return {
    ...statuses,
    [status]: Math.max(0, statuses[status] - amount),
  };
}

export function decayTurnDurationStatuses(
  statuses: CombatStatuses,
): CombatStatuses {
  const weak = Math.max(0, statuses.weak - 1);
  const exposed = Math.max(0, statuses.exposed - 1);
  if (weak === statuses.weak && exposed === statuses.exposed) {
    return statuses;
  }
  return { ...statuses, weak, exposed };
}
