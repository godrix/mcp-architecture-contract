import { resolve } from "node:path";
import {
  loadManifest,
  ManifestNotFoundError,
  type LoadedManifest,
} from "./manifest/loader.js";
import { buildLayerFileMap } from "./utils/layers.js";

export function resolveWorkspaceRoot(workspaceRoot?: string): string {
  return workspaceRoot ?? process.cwd();
}

const manifestCache = new Map<string, LoadedManifest>();

export function getLoadedManifest(workspaceRoot?: string): LoadedManifest {
  const root = resolveWorkspaceRoot(workspaceRoot);
  const key = resolve(root);
  const cached = manifestCache.get(key);
  if (cached) return cached;
  const loaded = loadManifest(root);
  manifestCache.set(key, loaded);
  return loaded;
}

export function clearManifestCache(): void {
  manifestCache.clear();
}

export async function getLayerFileMap(
  workspaceRoot?: string
): Promise<Map<string, import("./manifest/schema.js").Layer>> {
  const loaded = getLoadedManifest(workspaceRoot);
  return buildLayerFileMap(loaded.workspaceRoot, loaded.manifest);
}

export function manifestErrorMessage(err: unknown): string {
  if (err instanceof ManifestNotFoundError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
