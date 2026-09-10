import { formatDiagnostics, loadRegistry } from "../../src/content/registry.mjs";

const inputPaths = process.argv.slice(2).filter((argument) => argument !== "--");
const registry = await loadRegistry(inputPaths);

console.log(`M01 content validation: ${registry.status.toUpperCase()}`);
for (const kind of ["card", "relic", "enemy", "event"]) {
  const count = registry.counts[kind];
  console.log(`${kind}: ${count.valid}/${count.total} valid`);
}

if (registry.files.length === 0 && registry.diagnostics.length === 0) {
  console.log("No JSON definitions supplied; the M01 production content directory is not present yet.");
}

for (const diagnostic of formatDiagnostics(registry.diagnostics)) {
  console.error(diagnostic);
}

process.exitCode = registry.status === "valid" ? 0 : 1;
