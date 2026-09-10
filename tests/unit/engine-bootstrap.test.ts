import { describe, expect, it } from "vitest";
import {
  CONTENT_VERSION,
  ENGINE_VERSION,
  createEngineBootstrap,
} from "../../src/engine";

describe("M00 engine boundary", () => {
  it("creates a stable rendering-independent version snapshot", () => {
    const bootstrap = createEngineBootstrap({
      contentVersion: "content.m00.test",
    });

    expect(bootstrap).toStrictEqual({
      engineVersion: ENGINE_VERSION,
      contentVersion: "content.m00.test",
      phase: "bootstrap",
    });
    expect(bootstrap.engineVersion).toBe("0.1.0");
    expect(CONTENT_VERSION).toBe("m00");
    expect(Object.isFrozen(bootstrap)).toBe(true);
  });
});
