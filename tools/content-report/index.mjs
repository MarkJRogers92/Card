import { formatDiagnostics, loadRegistry } from "../../src/content/registry.mjs";

const args = process.argv.slice(2).filter((argument) => argument !== "--");
const jsonOutput = args.includes("--json");
const inputPaths = args.filter((argument) => argument !== "--json");
const registry = await loadRegistry(inputPaths);
const report = {
  status: registry.status,
  counts: registry.counts,
  files: registry.files.map((file) => ({
    source: file.source,
    kind: file.kind,
    structurallyValid: file.structurallyValid,
    valid: file.valid,
  })),
  diagnostics: registry.diagnostics,
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`M01 content report: ${registry.status.toUpperCase()}`);
  for (const kind of ["card", "relic", "enemy", "event"]) {
    const count = registry.counts[kind];
    console.log(`${kind}: total=${count.total} valid=${count.valid} invalid=${count.invalid}`);
  }
  if (registry.files.length === 0 && registry.diagnostics.length === 0) {
    console.log("No JSON definitions supplied; report is empty but valid.");
  }
  for (const diagnostic of formatDiagnostics(registry.diagnostics)) {
    console.error(diagnostic);
  }
}

process.exitCode = registry.status === "valid" ? 0 : 1;
