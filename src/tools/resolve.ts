import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { resolveKind } from "../core/resolveKind.js";

export interface ArcResolveInput {
  workspaceRoot?: string;
  kind: string;
  name: string;
}

export function arcResolve(input: ArcResolveInput) {
  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);
    return resolveKind(workspaceRoot, manifest, input.kind, input.name);
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
