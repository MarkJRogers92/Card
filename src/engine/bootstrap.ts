/**
 * The smallest public engine boundary for M00.
 *
 * This module is intentionally rendering-independent. It exposes version
 * identity only; combat rules and mutable game state begin in later milestones.
 */
export const ENGINE_VERSION = "0.1.0";
export const CONTENT_VERSION = "m00";

export type EnginePhase = "bootstrap";

export interface EngineBootstrap {
  readonly engineVersion: string;
  readonly contentVersion: string;
  readonly phase: EnginePhase;
}

export interface BootstrapOptions {
  readonly contentVersion?: string;
}

export function createEngineBootstrap(
  options: BootstrapOptions = {},
): EngineBootstrap {
  return Object.freeze({
    engineVersion: ENGINE_VERSION,
    contentVersion: options.contentVersion ?? CONTENT_VERSION,
    phase: "bootstrap" as const,
  });
}
