import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRegistry } from "../../src/content/registry.mjs";

const rootDir = process.cwd();

function fixturePath(...parts: string[]) {
  return path.join("tests", "fixtures", ...parts);
}

async function readFixture(...parts: string[]) {
  return JSON.parse(await readFile(path.join(rootDir, fixturePath(...parts)), "utf8")) as {
    choices: Array<{ effects: Array<{ op: string }> }>;
  };
}

function diagnosticFor(
  registry: Awaited<ReturnType<typeof loadRegistry>>,
  code: string,
  instancePath: string,
) {
  return registry.diagnostics.find(
    (diagnostic) => diagnostic.code === code && diagnostic.path === instancePath,
  );
}

describe("M01 content registry", () => {
  it("loads one valid definition of every supported kind and every effect operation", async () => {
    const registry = await loadRegistry([fixturePath("valid")], { rootDir });
    const event = await readFixture("valid", "events", "fixture-event.json");
    const expectedOperations = [
      "damage",
      "block",
      "heal",
      "apply_status",
      "draw",
      "gain_energy",
      "swap",
      "boost_imprint",
      "add_card",
      "install_protocol",
      "schedule_packet",
      "repeat_packet",
      "gain_scrap",
      "gain_evidence",
      "change_standing",
      "set_flag",
      "remove_card",
      "upgrade_card",
    ];

    expect(registry.status).toBe("valid");
    expect(registry.definitions).toHaveLength(4);
    expect(registry.counts).toStrictEqual({
      card: { total: 1, valid: 1, invalid: 0 },
      relic: { total: 1, valid: 1, invalid: 0 },
      enemy: { total: 1, valid: 1, invalid: 0 },
      event: { total: 1, valid: 1, invalid: 0 },
    });
    expect(event.choices[0].effects.map((effect) => effect.op)).toStrictEqual(expectedOperations);
  });

  it.each([
    ["unknown field", ["invalid", "cards", "unknown-field.json"], "unknown_field", "/unexpected"],
    ["invalid ID", ["invalid", "cards", "invalid-id.json"], "invalid_id", "/id"],
    [
      "missing parameter",
      ["invalid", "cards", "missing-parameter.json"],
      "missing_parameter",
      "/effects/0/amount/param",
    ],
    [
      "unsupported operation",
      ["invalid", "cards", "unsupported-operation.json"],
      "unsupported_operation",
      "/effects/0/op",
    ],
    [
      "malformed operation",
      ["invalid", "cards", "malformed-operation.json"],
      "invalid_operation",
      "/effects/0/op",
    ],
    [
      "deep expression",
      ["invalid", "cards", "deep-expression.json"],
      "expression_depth_exceeded",
      "/energyCost/add/1/add/1/add/1/add/1",
    ],
    [
      "malformed expression",
      ["invalid", "cards", "malformed-expression.json"],
      "unknown_field",
      "/energyCost/extra",
    ],
    [
      "multiple expression keys",
      ["invalid", "cards", "multiple-expression-keys.json"],
      "unknown_field",
      "/energyCost/param",
    ],
    [
      "reserved card root key",
      ["invalid", "cards", "root-reserved-key.json"],
      "unknown_field",
      "/const",
    ],
    [
      "reserved ordinary effect key",
      ["invalid", "cards", "effect-reserved-key.json"],
      "unknown_field",
      "/effects/0/add",
    ],
    [
      "reserved scheduled packet key",
      ["invalid", "cards", "scheduled-packet-reserved-key.json"],
      "unknown_field",
      "/effects/0/packet/multiply",
    ],
    [
      "reserved protocol trigger key",
      ["invalid", "cards", "protocol-trigger-reserved-key.json"],
      "unknown_field",
      "/effects/0/trigger/const",
    ],
    [
      "reserved additional cost key",
      ["invalid", "cards", "additional-cost-reserved-key.json"],
      "unknown_field",
      "/additionalCosts/0/const",
    ],
    [
      "reserved relic trigger key",
      ["invalid", "relics", "trigger-reserved-key.json"],
      "unknown_field",
      "/triggers/0/add",
    ],
    [
      "invalid effect payload",
      ["invalid", "cards", "invalid-effect.json"],
      "constraint_minimum",
      "/effects/0/hits",
    ],
    [
      "unsafe HP cost",
      ["invalid", "cards", "unsafe-cost.json"],
      "unsafe_hp_cost",
      "/additionalCosts/0/minimumRemaining",
    ],
    [
      "stat-based cost",
      ["invalid", "cards", "stat-cost.json"],
      "unresolved_cost_stat",
      "/energyCost/stat",
    ],
    [
      "stat-based additional cost",
      ["invalid", "cards", "additional-stat-cost.json"],
      "unresolved_cost_stat",
      "/additionalCosts/0/amount/add/0/stat",
    ],
    [
      "overflowing cost",
      ["invalid", "cards", "overflow-cost.json"],
      "unsafe_cost_value",
      "/energyCost",
    ],
    [
      "negative upgraded cost",
      ["invalid", "cards", "upgraded-negative-cost.json"],
      "negative_cost",
      "/energyCost",
    ],
    [
      "missing protocol trigger filter",
      ["invalid", "cards", "missing-trigger-filter.json"],
      "missing_required_field",
      "/effects/0/trigger/filter",
    ],
    [
      "missing relic trigger filter",
      ["invalid", "relics", "missing-trigger-filter.json"],
      "missing_required_field",
      "/triggers/0/filter",
    ],
    [
      "owner and ingredient mismatch",
      ["invalid", "cards", "owner-ingredient-mismatch.json"],
      "owner_ingredient_mismatch",
      "/ingredient/kind",
    ],
    [
      "invalid event predicate",
      ["invalid", "events", "invalid-predicate.json"],
      "unknown_field",
      "/eligibility/when",
    ],
    [
      "unknown card reference",
      ["invalid", "events", "unknown-reference.json"],
      "unknown_reference",
      "/choices/0/effects/0/cardId",
    ],
    [
      "unknown enemy move reference",
      ["invalid", "enemies", "unknown-move-reference.json"],
      "unknown_reference",
      "/ai/moveIds/0",
    ],
  ] as const)("rejects %s with a stable diagnostic path", async (_label, parts, code, instancePath) => {
    const registry = await loadRegistry([fixturePath(...parts)], { rootDir });
    const diagnostic = diagnosticFor(registry, code, instancePath);

    expect(registry.status).toBe("invalid");
    expect(diagnostic).toBeDefined();
    expect(diagnostic).toMatchObject({
      phase: expect.any(String),
      keyword: expect.any(String),
      code,
      path: instancePath,
      message: expect.any(String),
    });
  });

  it("rejects duplicate definition IDs across the supplied set", async () => {
    const registry = await loadRegistry([fixturePath("invalid", "cards")], { rootDir });
    const duplicate = registry.diagnostics.find(
      (diagnostic) => diagnostic.code === "duplicate_id" && diagnostic.path === "/id",
    );

    expect(registry.status).toBe("invalid");
    expect(duplicate).toBeDefined();
    expect(duplicate?.message).toContain("card.duplicate");
  });

  it("keeps file and diagnostic ordering stable when input order changes", async () => {
    const card = fixturePath("valid", "cards", "fixture-card.json");
    const relic = fixturePath("valid", "relics", "fixture-relic.json");
    const first = await loadRegistry([relic, card], { rootDir });
    const second = await loadRegistry([card, relic], { rootDir });

    expect(first.files.map((file) => file.source)).toStrictEqual([
      "tests/fixtures/valid/cards/fixture-card.json",
      "tests/fixtures/valid/relics/fixture-relic.json",
    ]);
    expect(second.files.map((file) => file.source)).toStrictEqual(first.files.map((file) => file.source));
    expect(second.diagnostics).toStrictEqual(first.diagnostics);
  });
});
