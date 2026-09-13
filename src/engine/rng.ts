export const RNG_ALGORITHM_VERSION = "mulberry32-v1" as const;
export const RNG_STATE_VERSION = 1 as const;

export const GAMEPLAY_RNG_STREAMS = [
  "map",
  "encounter",
  "combat",
  "reward",
  "event",
] as const;

export type GameplayRngStream = (typeof GAMEPLAY_RNG_STREAMS)[number];
export type SeedInput = string | number;

export interface RngCursor {
  readonly algorithm: typeof RNG_ALGORITHM_VERSION;
  readonly state: number;
  readonly draws: number;
}

export type GameplayRngStreams = {
  readonly [K in GameplayRngStream]: RngCursor;
};

export interface GameplayRngState {
  readonly version: typeof RNG_STATE_VERSION;
  readonly rootSeed: string;
  readonly streams: GameplayRngStreams;
}

export interface CosmeticRngState {
  readonly version: typeof RNG_STATE_VERSION;
  readonly rootSeed: string;
  readonly cursor: RngCursor;
}

export interface RngDraw<TState> {
  readonly value: number;
  readonly state: TState;
}

export function normalizeSeed(seed: SeedInput): string {
  if (typeof seed === "number") {
    if (!Number.isSafeInteger(seed)) {
      throw new RangeError("Numeric seeds must be safe integers.");
    }
    return seed.toString(10);
  }

  if (seed.length === 0) {
    throw new RangeError("String seeds cannot be empty.");
  }
  return seed;
}

function hashSeed32(text: string): number {
  let hash = 0x811c9dc5;
  for (const symbol of text) {
    const codePoint = symbol.codePointAt(0) ?? 0;
    hash ^= codePoint;
    hash = Math.imul(hash, 0x01000193);
    hash ^= codePoint >>> 16;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function deriveCursor(rootSeed: string, stream: string): RngCursor {
  return {
    algorithm: RNG_ALGORITHM_VERSION,
    state: hashSeed32(`${RNG_ALGORITHM_VERSION}\u0000${rootSeed}\u0000${stream}`),
    draws: 0,
  };
}

function drawCursor(cursor: RngCursor): RngDraw<RngCursor> {
  if (cursor.algorithm !== RNG_ALGORITHM_VERSION) {
    throw new Error(`Unsupported RNG algorithm: ${cursor.algorithm}.`);
  }
  if (!Number.isSafeInteger(cursor.state) || cursor.state < 0 || cursor.state > 0xffffffff) {
    throw new RangeError("RNG state must be an unsigned 32-bit integer.");
  }
  if (!Number.isSafeInteger(cursor.draws) || cursor.draws < 0) {
    throw new RangeError("RNG draw count must be a nonnegative safe integer.");
  }

  const nextState = (cursor.state + 0x6d2b79f5) >>> 0;
  let mixed = nextState;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  const value = (mixed ^ (mixed >>> 14)) >>> 0;

  return {
    value,
    state: {
      algorithm: RNG_ALGORITHM_VERSION,
      state: nextState,
      draws: cursor.draws + 1,
    },
  };
}

export function createGameplayRngState(seed: SeedInput): GameplayRngState {
  const rootSeed = normalizeSeed(seed);
  return {
    version: RNG_STATE_VERSION,
    rootSeed,
    streams: {
      map: deriveCursor(rootSeed, "map"),
      encounter: deriveCursor(rootSeed, "encounter"),
      combat: deriveCursor(rootSeed, "combat"),
      reward: deriveCursor(rootSeed, "reward"),
      event: deriveCursor(rootSeed, "event"),
    },
  };
}

export function drawGameplayUint32(
  rng: GameplayRngState,
  stream: GameplayRngStream,
): RngDraw<GameplayRngState> {
  const draw = drawCursor(rng.streams[stream]);
  return {
    value: draw.value,
    state: {
      ...rng,
      streams: {
        ...rng.streams,
        [stream]: draw.state,
      },
    },
  };
}

export function drawGameplayInt(
  rng: GameplayRngState,
  stream: GameplayRngStream,
  maxExclusive: number,
): RngDraw<GameplayRngState> {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new RangeError("maxExclusive must be an integer from 1 through 2^32.");
  }

  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  let current = rng;
  while (true) {
    const draw = drawGameplayUint32(current, stream);
    current = draw.state;
    if (draw.value < limit) {
      return { value: draw.value % maxExclusive, state: current };
    }
  }
}

export function createCosmeticRngState(seed: SeedInput): CosmeticRngState {
  const rootSeed = normalizeSeed(seed);
  return {
    version: RNG_STATE_VERSION,
    rootSeed,
    cursor: deriveCursor(rootSeed, "cosmetic"),
  };
}

export function drawCosmeticUint32(
  rng: CosmeticRngState,
): RngDraw<CosmeticRngState> {
  const draw = drawCursor(rng.cursor);
  return {
    value: draw.value,
    state: {
      ...rng,
      cursor: draw.state,
    },
  };
}
