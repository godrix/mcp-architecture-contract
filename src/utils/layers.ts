import { relative, resolve } from "node:path";
import type { ArcManifest, Layer } from "../manifest/schema.js";
import { globAllLayerFiles } from "./glob.js";
import { sourceRoot } from "./paths.js";

export function getLayerById(manifest: ArcManifest, layerId: string): Layer | undefined {
  return manifest.layers.find((l) => l.id === layerId);
}

export function pathMatchesLayer(relPath: string, layer: Layer): boolean {
  const norm = relPath.replace(/\\/g, "/");
  const idAsPath = layer.id.replace(/\./g, "/");
  if (idAsPath && (norm.includes(`/${idAsPath}/`) || norm.includes(`/${idAsPath}.`))) {
    return true;
  }
  const pattern = layer.path
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\/+/g, "/");
  const segments = pattern
    .split("/")
    .filter(
      (s) =>
        s &&
        s !== "src" &&
        s !== "main" &&
        s !== "java" &&
        s !== "ts" &&
        s !== "tsx"
    );
  return segments.some((seg) => norm.includes(`/${seg}/`) || norm.endsWith(`/${seg}`));
}

const layerMapCache = new Map<string, Map<string, Layer>>();

export async function buildLayerFileMap(
  workspaceRoot: string,
  manifest: ArcManifest
): Promise<Map<string, Layer>> {
  const key = `${resolve(workspaceRoot)}:${manifest.profile}:${manifest.layers.length}`;
  const cached = layerMapCache.get(key);
  if (cached) return cached;

  const map = new Map<string, Layer>();
  const all = await globAllLayerFiles(workspaceRoot, manifest);
  for (const { path, layer } of all) {
    map.set(resolve(path), layer);
  }
  layerMapCache.set(key, map);
  return map;
}

export function clearLayerMapCache(): void {
  layerMapCache.clear();
}

export function inferLayerForFile(
  workspaceRoot: string,
  manifest: ArcManifest,
  absolutePath: string,
  layerFileMap?: Map<string, Layer>
): Layer | undefined {
  const abs = resolve(absolutePath);
  if (layerFileMap?.has(abs)) {
    return layerFileMap.get(abs);
  }

  const root = resolve(workspaceRoot, sourceRoot(manifest));
  const rel = relative(root, abs).replace(/\\/g, "/");

  for (const layer of manifest.layers) {
    if (pathMatchesLayer(rel, layer)) {
      return layer;
    }
  }
  return undefined;
}
