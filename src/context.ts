import {
  loadManifest,
  ManifestNotFoundError,
  type LoadedManifest,
} from "./manifest/loader.js";

export function resolveWorkspaceRoot(workspaceRoot?: string): string {
  return workspaceRoot ?? process.cwd();
}

export function getLoadedManifest(workspaceRoot?: string): LoadedManifest {
  const root = resolveWorkspaceRoot(workspaceRoot);
  return loadManifest(root);
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
