import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import {
  applyNamingTemplate,
  buildNamingContext,
  resolveNamingKey,
} from "../utils/naming.js";
import { getLayerById } from "../utils/layers.js";
import { toRelativePath } from "../utils/paths.js";
import { resolve } from "node:path";

export interface ArcSuggestLocationInput {
  workspaceRoot?: string;
  role: string;
  name: string;
}

export function arcSuggestLocation(input: ArcSuggestLocationInput) {
  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);
    const namingKey = resolveNamingKey(manifest, input.role, input.role);
    const template = manifest.naming[namingKey];
    if (!template) {
      throw new Error(`Role/naming não encontrado: ${input.role}`);
    }

    let layerId = input.role;
    for (const layer of manifest.layers) {
      if (template.includes(layer.id.replace(/\./g, "/"))) {
        layerId = layer.id;
        break;
      }
    }

    const layer = getLayerById(manifest, layerId) ?? manifest.layers[0];
    const ctx = buildNamingContext(manifest, input.name, layer);
    const relativePath = applyNamingTemplate(template, ctx);
    const abs = resolve(workspaceRoot, relativePath);

    return {
      relativePath: toRelativePath(workspaceRoot, abs),
      layerId: layer?.id ?? layerId,
      namingKey,
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
