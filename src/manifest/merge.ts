import deepmerge from "deepmerge";
import type { ArcManifest } from "./schema.js";

function mergeLayers(
  parent: ArcManifest["layers"],
  child: ArcManifest["layers"]
): ArcManifest["layers"] {
  const byId = new Map(parent.map((l) => [l.id, { ...l }]));
  for (const layer of child) {
    const existing = byId.get(layer.id);
    byId.set(layer.id, existing ? deepmerge(existing, layer) : layer);
  }
  return [...byId.values()];
}

function mergeRules(
  parent: ArcManifest["rules"],
  child: ArcManifest["rules"]
): ArcManifest["rules"] {
  const byId = new Map((parent ?? []).map((r) => [r.id, { ...r }]));
  for (const rule of child ?? []) {
    byId.set(rule.id, rule);
  }
  return [...byId.values()];
}

function mergeKinds(
  parent: ArcManifest["kinds"],
  child: ArcManifest["kinds"]
): ArcManifest["kinds"] {
  const result = { ...parent };
  for (const [id, kind] of Object.entries(child)) {
    result[id] = result[id] ? deepmerge(result[id], kind) : kind;
  }
  return result;
}

function mergeNaming(
  parent: ArcManifest["naming"],
  child: ArcManifest["naming"]
): ArcManifest["naming"] {
  return { ...parent, ...child };
}

/** Parent/extends merge: child overrides scalars; layers/rules/kinds merge by id. */
export function mergeManifests(
  base: ArcManifest,
  override: Partial<ArcManifest>
): ArcManifest {
  const merged = deepmerge(base, override, {
    arrayMerge: (_target, source) => source,
  }) as ArcManifest;

  if (override.layers) {
    merged.layers = mergeLayers(base.layers, override.layers);
  }
  if (override.rules) {
    merged.rules = mergeRules(base.rules ?? [], override.rules);
  }
  if (override.kinds) {
    merged.kinds = mergeKinds(base.kinds, override.kinds);
  }
  if (override.naming) {
    merged.naming = mergeNaming(base.naming, override.naming);
  }
  if (override.slices && base.slices) {
    merged.slices = { ...base.slices, ...override.slices };
  }

  return merged;
}
