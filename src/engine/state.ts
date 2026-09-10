import { hashCanonical } from "./canonical";
import { CONTENT_VERSION, ENGINE_VERSION } from "./bootstrap";
import type { CombatState } from "./combat";
import {
  createGameplayRngState,
  drawGameplayInt,
  drawGameplayUint32,
  type GameplayRngState,
  type GameplayRngStream,
  type RngDraw,
  type SeedInput,
} from "./rng";

export const AUTHORITATIVE_STATE_VERSION = 7 as const;

export interface AuthoritativeState {
  readonly stateVersion: typeof AUTHORITATIVE_STATE_VERSION;
  readonly engineVersion: string;
  readonly contentVersion: string;
  readonly contentHash: string;
  readonly commandSequence: number;
  readonly rng: GameplayRngState;
  readonly combat: CombatState | null;
}

export interface AuthoritativeStateOptions {
  readonly seed: SeedInput;
  readonly contentVersion?: string;
  readonly contentHash: string;
}

function assertNonEmpty(label: string, value: string): void {
  if (value.length === 0) {
    throw new RangeError(`${label} cannot be empty.`);
  }
}

export function createAuthoritativeState(
  options: AuthoritativeStateOptions,
): AuthoritativeState {
  const contentVersion = options.contentVersion ?? CONTENT_VERSION;
  assertNonEmpty("contentVersion", contentVersion);
  assertNonEmpty("contentHash", options.contentHash);

  return {
    stateVersion: AUTHORITATIVE_STATE_VERSION,
    engineVersion: ENGINE_VERSION,
    contentVersion,
    contentHash: options.contentHash,
    commandSequence: 0,
    rng: createGameplayRngState(options.seed),
    combat: null,
  };
}

export function hashAuthoritativeState(state: AuthoritativeState): string {
  return hashCanonical(state);
}

export function drawStateUint32(
  state: AuthoritativeState,
  stream: GameplayRngStream,
): RngDraw<AuthoritativeState> {
  const draw = drawGameplayUint32(state.rng, stream);
  return {
    value: draw.value,
    state: {
      ...state,
      rng: draw.state,
    },
  };
}

export function drawStateInt(
  state: AuthoritativeState,
  stream: GameplayRngStream,
  maxExclusive: number,
): RngDraw<AuthoritativeState> {
  const draw = drawGameplayInt(state.rng, stream, maxExclusive);
  return {
    value: draw.value,
    state: {
      ...state,
      rng: draw.state,
    },
  };
}
