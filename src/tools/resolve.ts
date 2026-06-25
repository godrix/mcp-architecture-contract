import { readAndCompileTemplate } from "./scaffold.js";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { resolveKind } from "../core/resolveKind.js";
import { buildNamingContext } from "../utils/naming.js";
import { getLayerById } from "../utils/layers.js";

export interface ArcResolveInput {
  workspaceRoot?: string;
  kind: string;
  name: string;
  includePreview?: boolean;
}

export function arcResolve(input: ArcResolveInput) {
  try {
    const { manifest, workspaceRoot, pluginRoots } = getLoadedManifest(
      input.workspaceRoot
    );
    const result = resolveKind(workspaceRoot, manifest, input.kind, input.name);

    if (!input.includePreview) {
      return result;
    }

    const filesWithPreview = result.files.map((file) => {
      try {
        const layer = getLayerById(manifest, file.layer);
        const ctx = buildNamingContext(manifest, input.name, layer);
        const hbCtx: Record<string, string> = {
          Name: ctx.Name,
          name: ctx.name,
          package: ctx.package,
          layer: ctx.layer,
          projectName: ctx.projectName,
        };
        const content = readAndCompileTemplate(
          workspaceRoot,
          file.template,
          hbCtx,
          pluginRoots
        );
        return {
          ...file,
          preview: content.split("\n").slice(0, 40),
        };
      } catch {
        return file;
      }
    });

    return { ...result, files: filesWithPreview };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
