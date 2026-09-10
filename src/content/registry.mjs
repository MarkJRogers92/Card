import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

export const DEFINITION_KINDS = ["card", "relic", "enemy", "event"];

const schemaNames = ["common", "effect", "card", "relic", "enemy", "event"];
const schemaIds = new Map(
  schemaNames.map((name) => [
    name,
    `https://joint-liability.local/schemas/${name}.schema.json`,
  ]),
);
const definitionSchemas = new Map(
  DEFINITION_KINDS.map((kind) => [
    kind,
    `https://joint-liability.local/schemas/${kind}.schema.json`,
  ]),
);

export const SUPPORTED_OPERATIONS = [
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

const supportedOperationSet = new Set(SUPPORTED_OPERATIONS);
const statReferences = new Set([
  "owner_hp",
  "owner_max_hp",
  "front_hp",
  "front_max_hp",
  "reserve_hp",
  "reserve_max_hp",
  "energy",
  "imprint_potency",
  "enemy_hp",
  "enemy_max_hp",
  "scrap",
  "evidence",
]);
const hpCostResources = new Set(["owner_hp", "front_hp", "reserve_hp"]);
const materialIds = new Set(["gore", "volt", "rot", "echo"]);
const formIds = new Set(["needle", "burst", "siphon", "loop"]);
const expressionKeys = ["const", "param", "stat", "add", "multiply"];
const definitionKindByDirectory = new Map([
  ["card", "card"],
  ["cards", "card"],
  ["relic", "relic"],
  ["relics", "relic"],
  ["enemy", "enemy"],
  ["enemies", "enemy"],
  ["event", "event"],
  ["events", "event"],
]);

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_ROOT_DIR = moduleRoot;

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function joinPointer(base, segment) {
  return `${base}/${pointerSegment(segment)}`;
}

function relativeSource(source, rootDir) {
  const relative = path.relative(rootDir, source);
  return relative && !relative.startsWith("..") ? relative : source;
}

function makeDiagnostic({
  phase,
  source,
  kind,
  path: instancePath,
  keyword,
  code,
  message,
}) {
  return {
    phase,
    source,
    kind,
    path: instancePath || "",
    keyword,
    code,
    message,
  };
}

function sortDiagnostics(diagnostics) {
  const unique = new Map(
    diagnostics.map((diagnostic) => [
      [
        diagnostic.phase,
        diagnostic.source,
        diagnostic.kind ?? "",
        diagnostic.path,
        diagnostic.keyword,
        diagnostic.code,
        diagnostic.message,
      ].join("\u0000"),
      diagnostic,
    ]),
  );
  return [...unique.values()].sort((left, right) => {
    return (
      compareStrings(left.source, right.source) ||
      compareStrings(left.path, right.path) ||
      compareStrings(left.code, right.code) ||
      compareStrings(left.keyword, right.keyword) ||
      compareStrings(left.message, right.message)
    );
  });
}

function inferDefinitionKind(filePath) {
  const segments = filePath.split(path.sep).map((segment) => segment.toLowerCase());
  for (let index = segments.length - 2; index >= 0; index -= 1) {
    const kind = definitionKindByDirectory.get(segments[index]);
    if (kind) return kind;
  }

  const stem = path.basename(filePath, path.extname(filePath)).toLowerCase();
  return definitionKindByDirectory.get(stem) ?? null;
}

async function walkJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => compareStrings(left.name, right.name));
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(entryPath)));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".json") {
      files.push(entryPath);
    }
  }

  return files;
}

async function collectInputFiles(inputPaths, rootDir, diagnostics) {
  const paths = inputPaths.length > 0 ? inputPaths : [path.join(rootDir, "content")];
  const files = [];

  for (const inputPath of paths) {
    const absolutePath = path.resolve(rootDir, inputPath);
    let inputStat;
    try {
      inputStat = await stat(absolutePath);
    } catch (error) {
      if (inputPaths.length === 0 && error?.code === "ENOENT") {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          phase: "structural",
          source: relativeSource(absolutePath, rootDir),
          kind: null,
          path: "",
          keyword: "input",
          code: "input_not_found",
          message: "Input file or directory does not exist.",
        }),
      );
      continue;
    }

    if (inputStat.isDirectory()) {
      files.push(...(await walkJsonFiles(absolutePath)));
    } else if (inputStat.isFile()) {
      if (path.extname(absolutePath).toLowerCase() !== ".json") {
        diagnostics.push(
          makeDiagnostic({
            phase: "structural",
            source: relativeSource(absolutePath, rootDir),
            kind: null,
            path: "",
            keyword: "input",
            code: "input_not_json",
            message: "Input files must use the .json extension.",
          }),
        );
      } else {
        files.push(absolutePath);
      }
    }
  }

  return [...new Set(files)].sort(compareStrings);
}

async function loadSchemas(rootDir) {
  const schemas = [];
  for (const schemaName of schemaNames) {
    const schemaPath = path.join(rootDir, "schemas", `${schemaName}.schema.json`);
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    schemas.push({ schemaName, schemaPath, schema });
  }
  return schemas;
}

function createValidators(schemas) {
  const ajv = new Ajv2020({
    allErrors: true,
    discriminator: true,
    strict: true,
    validateSchema: true,
    messages: true,
  });

  for (const { schema } of schemas) {
    ajv.addSchema(schema, schema.$id);
  }

  const commonSchema = schemas.find(({ schemaName }) => schemaName === "common")?.schema;
  const valueExpressionAdditionalPropertyPaths = new Set(
    (commonSchema?.$defs?.ValueExpr?.oneOf ?? [])
      .map((branch) => branch.$ref?.split("/").at(-1))
      .filter(Boolean)
      .map((definitionName) => `#/$defs/${definitionName}/additionalProperties`),
  );

  return {
    ajv,
    valueExpressionAdditionalPropertyPaths,
    validators: new Map(
      DEFINITION_KINDS.map((kind) => [kind, ajv.getSchema(definitionSchemas.get(kind))]),
    ),
  };
}

function isIdPath(instancePath) {
  return instancePath === "/id" || instancePath.endsWith("/id") || instancePath.endsWith("Id");
}

function ajvErrorPath(error) {
  if (error.keyword === "required") {
    return joinPointer(error.instancePath ?? "", error.params.missingProperty);
  }
  if (error.keyword === "additionalProperties") {
    return joinPointer(error.instancePath ?? "", error.params.additionalProperty);
  }
  return error.instancePath ?? "";
}

function valueAtPointer(value, instancePath) {
  if (!instancePath) return value;
  return instancePath
    .split("/")
    .slice(1)
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, segment) => {
      if (current === null || current === undefined) return undefined;
      return current[segment];
    }, value);
}

function expressionKeysAt(data, instancePath) {
  const expression = valueAtPointer(data, instancePath);
  if (!expression || typeof expression !== "object" || Array.isArray(expression)) return [];
  return expressionKeys.filter((key) => Object.hasOwn(expression, key));
}

function isValueExpressionAdditionalPropertyError(
  data,
  error,
  valueExpressionAdditionalPropertyPaths,
) {
  return (
    error.keyword === "additionalProperties" &&
    expressionKeys.includes(error.params?.additionalProperty) &&
    valueExpressionAdditionalPropertyPaths.has(error.schemaPath ?? "") &&
    expressionKeysAt(data, error.instancePath ?? "").length === 1
  );
}

function mapAjvError(error, source, kind) {
  const instancePath = ajvErrorPath(error);
  const keyword = error.keyword;

  if (keyword === "oneOf" || keyword === "anyOf") return null;
  if (keyword === "discriminator") {
    if (error.params?.error === "mapping") return null;
    return makeDiagnostic({
      phase: "structural",
      source,
      kind,
      path: joinPointer(instancePath, "op"),
      keyword,
      code: "invalid_operation",
      message: "Operation op must be a string from the closed supported set.",
    });
  }
  if (keyword === "const" && instancePath.endsWith("/op")) return null;

  let code = `schema_${keyword}`;
  let message = error.message ?? "Schema validation failed.";
  if (keyword === "additionalProperties") {
    code = "unknown_field";
    message = `Unknown field ${String(error.params.additionalProperty)}.`;
  } else if (keyword === "required") {
    code = "missing_required_field";
    message = `Required field ${String(error.params.missingProperty)} is missing.`;
  } else if (
    isIdPath(instancePath) &&
    ["pattern", "minLength", "maxLength"].includes(keyword)
  ) {
    code = "invalid_id";
    message = "ID must be a stable lowercase identifier.";
  } else if (keyword === "enum" && instancePath.endsWith("/op")) {
    code = "unsupported_operation";
    message = "Operation is not in the closed supported operation set.";
  } else if (keyword === "uniqueItems") {
    code = "duplicate_item";
  } else if (keyword === "type") {
    code = "invalid_type";
  } else if (keyword === "minimum" || keyword === "maximum") {
    code = `constraint_${keyword}`;
  }

  return makeDiagnostic({
    phase: "structural",
    source,
    kind,
    path: instancePath,
    keyword,
    code,
    message,
  });
}

function collectUnsupportedOperations(value, instancePath, diagnostics, source, kind) {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      collectUnsupportedOperations(child, joinPointer(instancePath, index), diagnostics, source, kind),
    );
    return;
  }
  if (!value || typeof value !== "object") return;

  if (typeof value.op === "string" && !supportedOperationSet.has(value.op)) {
    diagnostics.push(
      makeDiagnostic({
        phase: "structural",
        source,
        kind,
        path: joinPointer(instancePath, "op"),
        keyword: "operation",
        code: "unsupported_operation",
        message: `Unsupported operation ${value.op}. Supported operations are closed and data-defined.`,
      }),
    );
  }

  for (const [key, child] of Object.entries(value)) {
    collectUnsupportedOperations(child, joinPointer(instancePath, key), diagnostics, source, kind);
  }
}

function structuralDiagnostics(
  data,
  source,
  kind,
  validator,
  valueExpressionAdditionalPropertyPaths,
) {
  const diagnostics = [];
  if (!validator) {
    diagnostics.push(
      makeDiagnostic({
        phase: "structural",
        source,
        kind,
        path: "",
        keyword: "kind",
        code: "unknown_definition_kind",
        message: "Place definitions under cards, relics, enemies, or events.",
      }),
    );
    return diagnostics;
  }

  const schemaValid = validator(data);
  const errors = validator.errors ?? [];
  const pathsWithUnknownFields = new Set(
    errors
      .filter((error) => error.keyword === "additionalProperties")
      .map((error) => error.instancePath ?? ""),
  );
  for (const error of errors) {
    if (
      isValueExpressionAdditionalPropertyError(
        data,
        error,
        valueExpressionAdditionalPropertyPaths,
      )
    ) {
      continue;
    }
    if (
      error.keyword === "required" &&
      pathsWithUnknownFields.has(error.instancePath ?? "")
    ) {
      continue;
    }
    const diagnostic = mapAjvError(error, source, kind);
    if (diagnostic) diagnostics.push(diagnostic);
  }
  collectUnsupportedOperations(data, "", diagnostics, source, kind);
  if (!schemaValid && diagnostics.length === 0) {
    diagnostics.push(
      makeDiagnostic({
        phase: "structural",
        source,
        kind,
        path: "",
        keyword: "schema",
        code: "schema_invalid",
        message: "Definition failed JSON Schema validation.",
      }),
    );
  }
  return diagnostics;
}

function evaluateExpression(expression, parameters) {
  if (!expression || typeof expression !== "object") return undefined;
  if (Object.hasOwn(expression, "const")) {
    return Number.isSafeInteger(expression.const) ? expression.const : undefined;
  }
  if (Object.hasOwn(expression, "param")) {
    const value = parameters.get(expression.param);
    return Number.isSafeInteger(value) ? value : undefined;
  }
  if (Object.hasOwn(expression, "stat")) return undefined;

  const operation = Object.hasOwn(expression, "add") ? "add" : "multiply";
  const operands = expression[operation];
  if (!Array.isArray(operands) || operands.length !== 2) return undefined;
  const left = evaluateExpression(operands[0], parameters);
  const right = evaluateExpression(operands[1], parameters);
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) return undefined;
  const result = operation === "add" ? left + right : left * right;
  return Number.isSafeInteger(result) ? result : undefined;
}

function expressionContainsStat(expression) {
  if (!expression || typeof expression !== "object") return false;
  if (Object.hasOwn(expression, "stat")) return true;
  return ["add", "multiply"].some((operation) =>
    Array.isArray(expression[operation]) && expression[operation].some(expressionContainsStat),
  );
}

function expressionContainsMissingParameter(expression, parameters) {
  if (!expression || typeof expression !== "object") return false;
  if (Object.hasOwn(expression, "param") && !parameters.has(expression.param)) return true;
  return ["add", "multiply"].some((operation) =>
    Array.isArray(expression[operation]) &&
    expression[operation].some((operand) => expressionContainsMissingParameter(operand, parameters)),
  );
}

function validateExpression(
  expression,
  instancePath,
  parameters,
  diagnostics,
  source,
  kind,
  depth = 1,
  costContext = false,
) {
  if (!expression || typeof expression !== "object") return;
  if (depth > 4) {
    diagnostics.push(
      makeDiagnostic({
        phase: "semantic",
        source,
        kind,
        path: instancePath,
        keyword: "expression_depth",
        code: "expression_depth_exceeded",
        message: "Value expressions may be nested no deeper than 4 levels.",
      }),
    );
    return;
  }

  if (Object.hasOwn(expression, "param")) {
    if (!parameters.has(expression.param)) {
      diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source,
          kind,
          path: joinPointer(instancePath, "param"),
          keyword: "parameter",
          code: "missing_parameter",
          message: `Parameter ${String(expression.param)} is not declared by this definition.`,
        }),
      );
    }
    return;
  }

  if (Object.hasOwn(expression, "stat")) {
    if (!statReferences.has(expression.stat)) {
      diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source,
          kind,
          path: joinPointer(instancePath, "stat"),
          keyword: "stat_reference",
          code: "unknown_stat_reference",
          message: `Stat reference ${String(expression.stat)} is not allowlisted.`,
        }),
      );
    }
    if (costContext && statReferences.has(expression.stat)) {
      diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source,
          kind,
          path: joinPointer(instancePath, "stat"),
          keyword: "cost",
          code: "unresolved_cost_stat",
          message: "Base costs must be stat-free and statically resolvable at load time.",
        }),
      );
    }
    return;
  }

  for (const operation of ["add", "multiply"]) {
    if (Object.hasOwn(expression, operation) && Array.isArray(expression[operation])) {
      expression[operation].forEach((operand, index) =>
        validateExpression(
          operand,
          joinPointer(joinPointer(instancePath, operation), index),
          parameters,
          diagnostics,
          source,
          kind,
          depth + 1,
          costContext,
        ),
      );
    }
  }
}

function validateStaticCostExpression(
  expression,
  instancePath,
  parameters,
  upgradedParameters,
  diagnostics,
  source,
  kind,
) {
  validateExpression(
    expression,
    instancePath,
    parameters,
    diagnostics,
    source,
    kind,
    1,
    true,
  );
  const values = [
    evaluateExpression(expression, parameters),
    evaluateExpression(expression, upgradedParameters),
  ];
  if (
    values.some((value) => Number.isSafeInteger(value) && value < 0)
  ) {
    diagnostics.push(
      makeDiagnostic({
        phase: "semantic",
        source,
        kind,
        path: instancePath,
        keyword: "cost",
        code: "negative_cost",
        message: "Costs must resolve to nonnegative integers.",
      }),
    );
  }
  if (
    values.some((value) => value === undefined) &&
    !expressionContainsStat(expression) &&
    !expressionContainsMissingParameter(expression, parameters) &&
    !expressionContainsMissingParameter(expression, upgradedParameters)
  ) {
    diagnostics.push(
      makeDiagnostic({
        phase: "semantic",
        source,
        kind,
        path: instancePath,
        keyword: "cost",
        code: "unsafe_cost_value",
        message: "Costs must resolve to finite safe integers for base and upgraded parameters.",
      }),
    );
  }
}

function validateCost(
  cost,
  instancePath,
  parameters,
  upgradedParameters,
  diagnostics,
  source,
  kind,
) {
  if (!cost || typeof cost !== "object") return;
  validateStaticCostExpression(
    cost.amount,
    joinPointer(instancePath, "amount"),
    parameters,
    upgradedParameters,
    diagnostics,
    source,
    kind,
  );
  if (hpCostResources.has(cost.resource) && (cost.minimumRemaining ?? 0) < 1) {
    diagnostics.push(
      makeDiagnostic({
        phase: "semantic",
        source,
        kind,
        path: joinPointer(instancePath, "minimumRemaining"),
        keyword: "cost",
        code: "unsafe_hp_cost",
        message: "Self-HP costs must leave the paying character at least 1 HP.",
      }),
    );
  }
}

function validatePredicate(predicate, instancePath, diagnostics, source, kind) {
  if (!predicate || typeof predicate !== "object") return;
  if (predicate.can_pay) {
    const { resource, minimumRemaining } = predicate.can_pay;
    if (hpCostResources.has(resource) && (minimumRemaining ?? 0) < 1) {
      diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source,
          kind,
          path: joinPointer(joinPointer(instancePath, "can_pay"), "minimumRemaining"),
          keyword: "predicate",
          code: "unsafe_hp_predicate",
          message: "HP payment predicates must require at least 1 HP remaining.",
        }),
      );
    }
  }
  for (const branch of ["all", "any"]) {
    if (Array.isArray(predicate[branch])) {
      predicate[branch].forEach((child, index) =>
        validatePredicate(
          child,
          joinPointer(joinPointer(instancePath, branch), index),
          diagnostics,
          source,
          kind,
        ),
      );
    }
  }
}

function validateIngredient(ingredient, instancePath, diagnostics, source, kind) {
  if (!ingredient || typeof ingredient !== "object") return;
  const allowlist = ingredient.kind === "material" ? materialIds : formIds;
  if (!allowlist.has(ingredient.id)) {
    diagnostics.push(
      makeDiagnostic({
        phase: "semantic",
        source,
        kind,
        path: joinPointer(instancePath, "id"),
        keyword: "allowlist",
        code: "invalid_ingredient",
        message: `Ingredient ${String(ingredient.id)} does not belong to ${ingredient.kind}.`,
      }),
    );
  }
}

function walkEffects(effects, instancePath, context) {
  if (!Array.isArray(effects)) return;
  effects.forEach((effect, index) => {
    if (!effect || typeof effect !== "object") return;
    const effectPath = joinPointer(instancePath, index);
    const op = effect.op;
    if (typeof op !== "string") return;

    const expressionFields = ["amount"];
    for (const field of expressionFields) {
      if (Object.hasOwn(effect, field)) {
        validateExpression(
          effect[field],
          joinPointer(effectPath, field),
          context.parameters,
          context.diagnostics,
          context.source,
          context.kind,
        );
      }
    }

    if (op === "add_card" && !context.cardIds.has(effect.cardId)) {
      context.diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source: context.source,
          kind: context.kind,
          path: joinPointer(effectPath, "cardId"),
          keyword: "reference",
          code: "unknown_reference",
          message: `Card reference ${String(effect.cardId)} is not present in the supplied registry.`,
        }),
      );
    }

    if (op === "change_standing" && !["office", "union", "broadcast"].includes(effect.factionId)) {
      context.diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source: context.source,
          kind: context.kind,
          path: joinPointer(effectPath, "factionId"),
          keyword: "allowlist",
          code: "unknown_faction",
          message: `Faction ${String(effect.factionId)} is not allowlisted.`,
        }),
      );
    }

    if (op === "install_protocol" && effect.trigger) {
      walkEffects(effect.trigger.effects, joinPointer(joinPointer(effectPath, "trigger"), "effects"), context);
    }
    if (op === "schedule_packet" && effect.packet) {
      walkEffects(effect.packet.effects, joinPointer(joinPointer(effectPath, "packet"), "effects"), context);
    }
  });
}

function duplicateNestedIds(items, instancePath, context, label) {
  if (!Array.isArray(items)) return;
  const seen = new Map();
  items.forEach((item, index) => {
    if (!item || typeof item.id !== "string") return;
    const itemPath = joinPointer(joinPointer(instancePath, index), "id");
    const previous = seen.get(item.id);
    if (previous) {
      context.diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source: context.source,
          kind: context.kind,
          path: itemPath,
          keyword: "unique",
          code: "duplicate_id",
          message: `${label} ID ${item.id} duplicates ${previous}.`,
        }),
      );
    } else {
      seen.set(item.id, itemPath);
    }
  });
}

function semanticDiagnostics(kind, data, source, context) {
  const diagnostics = context.diagnostics;
  const parameters = new Map(
    Object.entries(data.parameters ?? {}).map(([name, value]) => [name, value.base]),
  );
  const upgradedParameters = new Map(
    Object.entries(data.parameters ?? {}).map(([name, value]) => [name, value.upgraded]),
  );
  const localContext = { ...context, kind, source, parameters };

  if (kind === "card") {
    validateStaticCostExpression(
      data.energyCost,
      "/energyCost",
      parameters,
      upgradedParameters,
      diagnostics,
      source,
      kind,
    );
    if (data.ingredient) {
      validateIngredient(data.ingredient, "/ingredient", diagnostics, source, kind);
      validateExpression(data.ingredient.prime, "/ingredient/prime", parameters, diagnostics, source, kind);
      const expectedKind = data.owner === "source" ? "material" : data.owner === "shaper" ? "form" : null;
      if (expectedKind === null || data.ingredient.kind !== expectedKind) {
        diagnostics.push(
          makeDiagnostic({
            phase: "semantic",
            source,
            kind,
            path: "/ingredient/kind",
            keyword: "ownership",
            code: "owner_ingredient_mismatch",
            message:
              data.owner === "crew"
                ? "Crew cards cannot carry an ingredient."
                : `${data.owner} cards must carry a ${expectedKind} ingredient.`,
          }),
        );
      }
    }
    if (Array.isArray(data.additionalCosts)) {
      data.additionalCosts.forEach((cost, index) =>
        validateCost(
          cost,
          joinPointer("/additionalCosts", index),
          parameters,
          upgradedParameters,
          diagnostics,
          source,
          kind,
        ),
      );
    }
    walkEffects(data.effects, "/effects", localContext);
  } else if (kind === "relic") {
    data.modifiers?.forEach((modifier, index) => {
      if (modifier.operation === "multiply" && modifier.value <= 0) {
        diagnostics.push(
          makeDiagnostic({
            phase: "semantic",
            source,
            kind,
            path: joinPointer(joinPointer("/modifiers", index), "value"),
            keyword: "modifier",
            code: "invalid_modifier_value",
            message: "Multipliers must be positive integer basis points.",
          }),
        );
      }
    });
    data.triggers?.forEach((trigger, index) =>
      walkEffects(trigger.effects, joinPointer(joinPointer("/triggers", index), "effects"), localContext),
    );
  } else if (kind === "enemy") {
    duplicateNestedIds(data.moves, "/moves", localContext, "Move");
    duplicateNestedIds(data.phases, "/phases", localContext, "Phase");
    const moveIds = new Set(data.moves?.map((move) => move.id));
    const checkMoveRef = (moveId, instancePath) => {
      if (!moveIds.has(moveId)) {
        diagnostics.push(
          makeDiagnostic({
            phase: "semantic",
            source,
            kind,
            path: instancePath,
            keyword: "reference",
            code: "unknown_reference",
            message: `Enemy move reference ${String(moveId)} does not match a move ID.`,
          }),
        );
      }
    };
    data.ai?.moveIds?.forEach((moveId, index) =>
      checkMoveRef(moveId, joinPointer("/ai/moveIds", index)),
    );
    if (data.ai && data.ai.startIndex >= data.ai.moveIds.length) {
      diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source,
          kind,
          path: "/ai/startIndex",
          keyword: "index",
          code: "invalid_ai_start_index",
          message: "AI startIndex must point inside its move cycle.",
        }),
      );
    }
    if (data.ai?.kind === "opening_cycle") {
      checkMoveRef(data.ai.openingMoveId, "/ai/openingMoveId");
    }
    data.phases?.forEach((phase, index) => {
      if (phase.hpAtMost > data.maxHp) {
        diagnostics.push(
          makeDiagnostic({
            phase: "semantic",
            source,
            kind,
            path: joinPointer(joinPointer("/phases", index), "hpAtMost"),
            keyword: "threshold",
            code: "invalid_phase_threshold",
            message: "Phase HP thresholds cannot exceed enemy maximum HP.",
          }),
        );
      }
      phase.moveIds?.forEach((moveId, moveIndex) =>
        checkMoveRef(moveId, joinPointer(joinPointer(joinPointer("/phases", index), "moveIds"), moveIndex)),
      );
    });
    data.moves?.forEach((move, index) =>
      walkEffects(move.effects, joinPointer(joinPointer("/moves", index), "effects"), localContext),
    );
  } else if (kind === "event") {
    validatePredicate(data.eligibility, "/eligibility", diagnostics, source, kind);
    duplicateNestedIds(data.choices, "/choices", localContext, "Choice");
    data.choices?.forEach((choice, index) => {
      const choicePath = joinPointer("/choices", index);
      validatePredicate(choice.requirements, joinPointer(choicePath, "requirements"), diagnostics, source, kind);
      choice.costs?.forEach((cost, costIndex) =>
        validateCost(
          cost,
          joinPointer(joinPointer(choicePath, "costs"), costIndex),
          parameters,
          upgradedParameters,
          diagnostics,
          source,
          kind,
        ),
      );
      walkEffects(choice.effects, joinPointer(choicePath, "effects"), localContext);
    });
  }
}

function validateGlobalReferences(files, diagnostics) {
  const seenIds = new Map();
  const duplicateSources = new Set();
  for (const file of files) {
    const id = file.data && typeof file.data.id === "string" ? file.data.id : null;
    if (!id) continue;
    const previous = seenIds.get(id);
    if (previous) {
      duplicateSources.add(previous.source);
      duplicateSources.add(file.source);
      diagnostics.push(
        makeDiagnostic({
          phase: "semantic",
          source: file.source,
          kind: file.kind,
          path: "/id",
          keyword: "unique",
          code: "duplicate_id",
          message: `Definition ID ${id} duplicates ${previous.source} (/id).`,
        }),
      );
    } else {
      seenIds.set(id, file);
    }
  }
  return duplicateSources;
}

export async function loadRegistry(inputPaths = [], options = {}) {
  const rootDir = path.resolve(options.rootDir ?? DEFAULT_ROOT_DIR);
  const collectionDiagnostics = [];
  const inputFiles = await collectInputFiles(inputPaths, rootDir, collectionDiagnostics);
  const schemas = await loadSchemas(rootDir);
  const { validators, valueExpressionAdditionalPropertyPaths } = createValidators(schemas);
  const files = [];
  const diagnostics = [...collectionDiagnostics];

  for (const filePath of inputFiles) {
    const source = relativeSource(filePath, rootDir);
    const kind = inferDefinitionKind(filePath);
    let data;
    try {
      data = JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
      diagnostics.push(
        makeDiagnostic({
          phase: "structural",
          source,
          kind,
          path: "",
          keyword: "json",
          code: "invalid_json",
          message: error instanceof Error ? error.message : "Input is not valid JSON.",
        }),
      );
    files.push({
      source,
      absolutePath: filePath,
      kind,
      data: null,
      structurallyValid: false,
      valid: false,
    });
      continue;
    }

    const fileDiagnostics = structuralDiagnostics(
      data,
      source,
      kind,
      validators.get(kind),
      valueExpressionAdditionalPropertyPaths,
    );
    diagnostics.push(...fileDiagnostics);
    files.push({
      source,
      absolutePath: filePath,
      kind,
      data,
      structurallyValid: fileDiagnostics.length === 0,
      valid: false,
    });
  }

  const duplicateSources = validateGlobalReferences(files, diagnostics);
  const cardIds = new Set(
    files.filter((file) => file.kind === "card" && file.structurallyValid).map((file) => file.data.id),
  );
  const semanticContext = { diagnostics, cardIds };
  for (const file of files) {
    if (file.structurallyValid && file.kind && file.data) {
      semanticDiagnostics(file.kind, file.data, file.source, semanticContext);
    }
  }

  const sortedDiagnostics = sortDiagnostics(diagnostics);
  const diagnosticSources = new Set(sortedDiagnostics.map((diagnostic) => diagnostic.source));
  const filesWithStatus = files.map((file) => ({
    ...file,
    valid:
      file.structurallyValid &&
      !diagnosticSources.has(file.source) &&
      !duplicateSources.has(file.source),
  }));
  const counts = Object.fromEntries(
    DEFINITION_KINDS.map((kind) => [
      kind,
      {
        total: filesWithStatus.filter((file) => file.kind === kind).length,
        valid: filesWithStatus.filter((file) => file.kind === kind && file.valid).length,
        invalid: filesWithStatus.filter((file) => file.kind === kind && !file.valid).length,
      },
    ]),
  );

  return {
    rootDir,
    files: filesWithStatus,
    definitions: filesWithStatus.filter((file) => file.valid && file.kind),
    diagnostics: sortedDiagnostics,
    counts,
    status: sortedDiagnostics.length === 0 ? "valid" : "invalid",
  };
}

export function formatDiagnostic(diagnostic) {
  const pathText = diagnostic.path || "/";
  return `${diagnostic.source}${pathText} [` +
    `${diagnostic.phase}/${diagnostic.code}/${diagnostic.keyword}] ${diagnostic.message}`;
}

export function formatDiagnostics(diagnostics) {
  return sortDiagnostics(diagnostics).map(formatDiagnostic);
}

export { schemaIds };
