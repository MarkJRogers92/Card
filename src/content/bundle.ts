import type { CardDefinition, RelicDefinition } from "./generated";

/**
 * Runtime content bundle.
 *
 * `registry.mjs` loads and validates content with Node APIs for the CLI tools
 * and tests. The game itself needs the same definitions in the browser, so this
 * module collects the checked-in JSON directly. Both consume the same files, so
 * a definition cannot exist for one and not the other.
 */

export interface ContentBundle {
  readonly cardFor: (definitionId: string) => CardDefinition | undefined;
  readonly relicFor: (relicId: string) => RelicDefinition | undefined;
  readonly cardIds: readonly string[];
  readonly relicIds: readonly string[];
}

const cardModules = import.meta.glob("../../content/cards/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, CardDefinition>;

const relicModules = import.meta.glob("../../content/relics/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, RelicDefinition>;

function indexById<T extends { readonly id: string }>(
  modules: Record<string, T>,
): ReadonlyMap<string, T> {
  const index = new Map<string, T>();
  for (const [path, definition] of Object.entries(modules)) {
    if (typeof definition?.id !== "string" || definition.id.length === 0) {
      throw new Error(`Content file ${path} has no definition id.`);
    }
    if (index.has(definition.id)) {
      throw new Error(`Duplicate content definition id: ${definition.id}.`);
    }
    index.set(definition.id, definition);
  }
  return index;
}

export function createContentBundle(): ContentBundle {
  const cards = indexById(cardModules);
  const relics = indexById(relicModules);
  return {
    cardFor: (definitionId) => cards.get(definitionId),
    relicFor: (relicId) => relics.get(relicId),
    cardIds: [...cards.keys()].sort(),
    relicIds: [...relics.keys()].sort(),
  };
}
