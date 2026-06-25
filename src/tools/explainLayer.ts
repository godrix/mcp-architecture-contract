import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { globAllLayerFiles } from "../utils/glob.js";
import { getLayerById } from "../utils/layers.js";
import { toRelativePath } from "../utils/paths.js";

export interface ArcExplainLayerInput {
  workspaceRoot?: string;
  layerId: string;
  exampleLimit?: number;
}

export async function arcExplainLayer(input: ArcExplainLayerInput) {
  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);
    const layer = getLayerById(manifest, input.layerId);
    if (!layer) {
      throw new Error(
        `Layer não encontrada: ${input.layerId}. Disponíveis: ${manifest.layers.map((l) => l.id).join(", ")}`
      );
    }

    const rules = (manifest.rules ?? []).filter((r) => {
      const whenLayer = r.when?.layer;
      if (!whenLayer) return true;
      const ids = Array.isArray(whenLayer) ? whenLayer : [whenLayer];
      return ids.includes(input.layerId);
    });

    const all = await globAllLayerFiles(workspaceRoot, manifest, input.layerId);
    const limit = input.exampleLimit ?? 3;
    const examples = all.slice(0, limit).map((f) => toRelativePath(workspaceRoot, f.path));

    return {
      layer,
      rules,
      examples,
      totalFiles: all.length,
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
