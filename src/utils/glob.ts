import fg from "fast-glob";
import { join, resolve } from "node:path";
import type { ArcManifest, Layer } from "../manifest/schema.js";
import { sourceRoot } from "./paths.js";

export async function globLayerFiles(
  workspaceRoot: string,
  manifest: ArcManifest,
  layer: Layer
): Promise<string[]> {
  const root = resolve(workspaceRoot, sourceRoot(manifest));
  const pattern = layer.path.startsWith("**/")
    ? layer.path
    : join("**", layer.path).replace(/\\/g, "/");

  const entries = await fg(pattern, {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/target/**"],
  });
  return entries;
}

export async function globDocs(
  workspaceRoot: string,
  docPatterns: string[]
): Promise<string[]> {
  const root = resolve(workspaceRoot);
  const all: string[] = [];
  for (const pattern of docPatterns) {
    const entries = await fg(pattern, {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      ignore: ["**/node_modules/**"],
    });
    all.push(...entries);
  }
  return [...new Set(all)].sort();
}

export async function globAllLayerFiles(
  workspaceRoot: string,
  manifest: ArcManifest,
  layerId?: string
): Promise<Array<{ path: string; layer: Layer }>> {
  const layers = layerId
    ? manifest.layers.filter((l) => l.id === layerId)
    : manifest.layers;

  const result: Array<{ path: string; layer: Layer }> = [];
  for (const layer of layers) {
    const files = await globLayerFiles(workspaceRoot, manifest, layer);
    for (const path of files) {
      result.push({ path, layer });
    }
  }
  return result;
}
