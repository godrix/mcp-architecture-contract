import { basename } from "node:path";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { globAllLayerFiles } from "../utils/glob.js";
import { toRelativePath } from "../utils/paths.js";

export interface ArcFindInput {
  workspaceRoot?: string;
  query: string;
  layerId?: string;
  limit?: number;
}

export interface ArcFindMatch {
  path: string;
  layerId: string;
  inferredRole: string;
}

export async function arcFind(input: ArcFindInput): Promise<{ matches: ArcFindMatch[] }> {
  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);
    const limit = input.limit ?? 50;
    const query = input.query.toLowerCase();

    const allFiles = await globAllLayerFiles(
      workspaceRoot,
      manifest,
      input.layerId
    );

    const matches: ArcFindMatch[] = [];
    for (const { path, layer } of allFiles) {
      const rel = toRelativePath(workspaceRoot, path);
      const fileName = basename(path);
      const suffixMatch = layer.suffix && fileName.includes(layer.suffix);
      const nameMatch =
        fileName.toLowerCase().includes(query) ||
        rel.toLowerCase().includes(query);

      if (!nameMatch && !suffixMatch) continue;

      let inferredRole = layer.id;
      for (const [role, pattern] of Object.entries(manifest.naming)) {
        if (pattern.includes(layer.suffix ?? "") || role.includes(layer.id)) {
          inferredRole = role;
          break;
        }
      }

      matches.push({
        path: rel,
        layerId: layer.id,
        inferredRole,
      });
      if (matches.length >= limit) break;
    }

    return { matches };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
