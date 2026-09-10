import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaDir = path.join(rootDir, "schemas");
const outputPath = path.join(rootDir, "src", "content", "generated.ts");

const schemaNames = ["common", "effect", "card", "relic", "enemy", "event"];

const localSchemaResolver = {
  order: 1,
  canRead: (file) => file.url.startsWith("https://joint-liability.local/schemas/"),
  read: (file) =>
    readFile(path.join(schemaDir, path.basename(new URL(file.url).pathname))),
};

const generatedHeader = `/* eslint-disable */
/**
 * GENERATED FILE. Do not edit by hand.
 * Source schemas: schemas/*.schema.json
 * Regenerate with: npm run content:types
 */
`;

function typeNameFor(schemaName) {
  return schemaName[0].toUpperCase() + schemaName.slice(1) + "Schema";
}

function indentBlock(source) {
  return source
    .split("\n")
    .map((line) => (line ? `  ${line}` : line))
    .join("\n");
}

async function buildGeneratedSource() {
  const chunks = [];

  for (const schemaName of schemaNames) {
    const schemaPath = path.join(schemaDir, `${schemaName}.schema.json`);
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    const generated = await compile(schema, typeNameFor(schemaName), {
      bannerComment: "",
      cwd: rootDir,
      unreachableDefinitions: true,
      $refOptions: {
        resolve: {
          http: false,
          localSchema: localSchemaResolver,
        },
      },
      style: {
        singleQuote: false,
      },
    });
    const namespaceName = typeNameFor(schemaName);
    chunks.push(
      `// Generated from ${path.relative(rootDir, schemaPath)}\n` +
        `export namespace ${namespaceName} {\n` +
        `${indentBlock(generated.trimEnd())}\n` +
        "}",
    );
  }

  const aliases = `
// Stable public aliases for the root content contracts.
export type ValueExpr = CommonSchema.ValueExpr;
export type Effect = EffectSchema.Effect;
export type CardDefinition = CardSchema.JointLiabilityCardDefinition;
export type RelicDefinition = RelicSchema.JointLiabilityRelicDefinition;
export type EnemyDefinition = EnemySchema.JointLiabilityEnemyDefinition;
export type EventDefinition = EventSchema.JointLiabilityEventDefinition;
`;

  return generatedHeader + chunks.join("\n\n") + aliases;
}

const generatedSource = await buildGeneratedSource();
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  let existingSource;
  try {
    existingSource = await readFile(outputPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.error(`Generated types are missing: ${path.relative(rootDir, outputPath)}`);
      process.exit(1);
    }
    throw error;
  }

  if (existingSource !== generatedSource) {
    console.error(
      `Generated type drift detected in ${path.relative(rootDir, outputPath)}. ` +
        "Run npm run content:types and review the result.",
    );
    process.exit(1);
  }

  console.log(`Generated types are up to date: ${path.relative(rootDir, outputPath)}`);
} else {
  await writeFile(outputPath, generatedSource, "utf8");
  console.log(`Generated ${path.relative(rootDir, outputPath)}`);
}
