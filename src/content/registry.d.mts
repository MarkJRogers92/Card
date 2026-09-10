export type DefinitionKind = "card" | "relic" | "enemy" | "event";

export interface ContentDiagnostic {
  phase: "structural" | "semantic";
  source: string;
  kind: DefinitionKind | null;
  path: string;
  keyword: string;
  code: string;
  message: string;
}

export interface DefinitionCounts {
  total: number;
  valid: number;
  invalid: number;
}

export interface RegistryFile {
  source: string;
  absolutePath: string;
  kind: DefinitionKind | null;
  data: unknown;
  structurallyValid: boolean;
  valid: boolean;
}

export interface ContentRegistry {
  rootDir: string;
  files: RegistryFile[];
  definitions: RegistryFile[];
  diagnostics: ContentDiagnostic[];
  counts: Record<DefinitionKind, DefinitionCounts>;
  status: "valid" | "invalid";
}

export const DEFINITION_KINDS: readonly DefinitionKind[];
export const SUPPORTED_OPERATIONS: readonly string[];
export const DEFAULT_ROOT_DIR: string;

export function loadRegistry(
  inputPaths?: string[],
  options?: { rootDir?: string },
): Promise<ContentRegistry>;
export function formatDiagnostic(diagnostic: ContentDiagnostic): string;
export function formatDiagnostics(diagnostics: ContentDiagnostic[]): string[];
