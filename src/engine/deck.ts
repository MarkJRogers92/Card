import type { CardInstance, CardInstanceId } from "./cards";
import {
  drawGameplayInt,
  type GameplayRngState,
} from "./rng";

export const CARD_ZONES = [
  "draw",
  "hand",
  "discard",
  "exhaust",
  "deployed",
] as const;

export type CardZoneName = (typeof CARD_ZONES)[number];

export interface CardZones {
  readonly draw: readonly CardInstanceId[];
  readonly hand: readonly CardInstanceId[];
  readonly discard: readonly CardInstanceId[];
  readonly exhaust: readonly CardInstanceId[];
  readonly deployed: readonly CardInstanceId[];
}

export interface DeckState {
  readonly instances: Readonly<Record<string, CardInstance>>;
  readonly zones: CardZones;
}

export interface DeckRngResult {
  readonly deck: DeckState;
  readonly rng: GameplayRngState;
}

export interface DrawResult extends DeckRngResult {
  readonly requested: number;
  readonly drawn: number;
  readonly toHand: readonly CardInstanceId[];
  readonly overflowToDiscard: readonly CardInstanceId[];
  readonly reshuffles: number;
}

function assertNonnegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`);
  }
}

export function createDeckState(cards: readonly CardInstance[]): DeckState {
  const instances: Record<string, CardInstance> = Object.create(null) as Record<
    string,
    CardInstance
  >;
  const draw: CardInstanceId[] = [];

  for (const card of cards) {
    if (instances[card.instanceId] !== undefined) {
      throw new Error(`Duplicate card instance ID: ${card.instanceId}.`);
    }
    instances[card.instanceId] = card;
    draw.push(card.instanceId);
  }

  const deck: DeckState = {
    instances,
    zones: {
      draw,
      hand: [],
      discard: [],
      exhaust: [],
      deployed: [],
    },
  };
  assertCardConservation(deck);
  return deck;
}

export function assertCardConservation(deck: DeckState): void {
  const expectedIds = Object.keys(deck.instances);
  const seen = new Set<string>();

  for (const zone of CARD_ZONES) {
    for (const instanceId of deck.zones[zone]) {
      if (deck.instances[instanceId] === undefined) {
        throw new Error(`Unknown card instance ${instanceId} in ${zone} zone.`);
      }
      if (seen.has(instanceId)) {
        throw new Error(`Card instance ${instanceId} exists in more than one zone.`);
      }
      seen.add(instanceId);
    }
  }

  if (seen.size !== expectedIds.length) {
    const missing = expectedIds.filter((instanceId) => !seen.has(instanceId));
    throw new Error(`Card conservation violation; missing instances: ${missing.join(", ")}.`);
  }

  for (const [instanceId, instance] of Object.entries(deck.instances)) {
    if (instance.instanceId !== instanceId) {
      throw new Error(`Card registry key ${instanceId} does not match its instanceId.`);
    }
  }
}

function shuffleIds(
  ids: readonly CardInstanceId[],
  rng: GameplayRngState,
): { readonly ids: readonly CardInstanceId[]; readonly rng: GameplayRngState } {
  const shuffled = [...ids];
  let nextRng = rng;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const draw = drawGameplayInt(nextRng, "combat", index + 1);
    nextRng = draw.state;
    const swapIndex = draw.value;
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return { ids: shuffled, rng: nextRng };
}

export function shuffleDrawPile(
  deck: DeckState,
  rng: GameplayRngState,
): DeckRngResult {
  const shuffled = shuffleIds(deck.zones.draw, rng);
  const nextDeck: DeckState = {
    ...deck,
    zones: {
      ...deck.zones,
      draw: shuffled.ids,
    },
  };
  assertCardConservation(nextDeck);
  return { deck: nextDeck, rng: shuffled.rng };
}

export function drawCards(
  deck: DeckState,
  rng: GameplayRngState,
  count: number,
  maxHandSize: number,
): DrawResult {
  assertNonnegativeInteger("draw count", count);
  assertNonnegativeInteger("maxHandSize", maxHandSize);

  let draw = [...deck.zones.draw];
  let hand = [...deck.zones.hand];
  let discard = [...deck.zones.discard];
  const overflowToDiscard: CardInstanceId[] = [];
  const toHand: CardInstanceId[] = [];
  let reshuffles = 0;
  let nextRng = rng;
  let drawn = 0;

  while (drawn < count) {
    if (draw.length === 0) {
      if (discard.length === 0) {
        break;
      }
      const reshuffled = shuffleIds(discard, nextRng);
      draw = [...reshuffled.ids];
      discard = [];
      nextRng = reshuffled.rng;
      reshuffles += 1;
    }

    const instanceId = draw.pop();
    if (instanceId === undefined) {
      break;
    }
    drawn += 1;

    if (hand.length < maxHandSize) {
      hand.push(instanceId);
      toHand.push(instanceId);
    } else {
      overflowToDiscard.push(instanceId);
    }
  }

  discard.push(...overflowToDiscard);
  const nextDeck: DeckState = {
    ...deck,
    zones: {
      ...deck.zones,
      draw,
      hand,
      discard,
    },
  };
  assertCardConservation(nextDeck);

  return {
    deck: nextDeck,
    rng: nextRng,
    requested: count,
    drawn,
    toHand,
    overflowToDiscard,
    reshuffles,
  };
}

export function discardHand(deck: DeckState): DeckState {
  const nextDeck: DeckState = {
    ...deck,
    zones: {
      ...deck.zones,
      hand: [],
      discard: [...deck.zones.discard, ...deck.zones.hand],
    },
  };
  assertCardConservation(nextDeck);
  return nextDeck;
}
