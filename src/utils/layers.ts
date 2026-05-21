import { relative, resolve } from "node:path";
import type { ArcManifest, Layer } from "../manifest/schema.js";
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
  const segments = pattern.split("/").filter((s) => s && s !== "src" && s !== "main" && s !== "java" && s !== "ts" && s !== "tsx");
  return segments.some((seg) => norm.includes(`/${seg}/`) || norm.endsWith(`/${seg}`));
}

export function inferLayerForFile(
  workspaceRoot: string,
  manifest: ArcManifest,
  absolutePath: string
): Layer | undefined {
  const root = resolve(workspaceRoot, sourceRoot(manifest));
  const rel = relative(root, absolutePath).replace(/\\/g, "/");

  for (const layer of manifest.layers) {
    if (pathMatchesLayer(rel, layer)) {
      return layer;
    }
  }
  return undefined;
}
