import { basename } from "node:path";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { globAllLayerFiles } from "../utils/glob.js";
import { toRelativePath } from "../utils/paths.js";

export interface ArcFindInput {
  workspaceRoot?: string;
  query: string;
  layerId?: string;
  role?: string;
  suffix?: string;
  limit?: number;
}

export interface ArcFindMatch {
  path: string;
  layerId: string;
  inferredRole: string;
  score: number;
}

function scoreMatch(
  query: string,
  fileName: string,
  rel: string,
  layerSuffix?: string
): number {
  const q = query.toLowerCase();
  const fn = fileName.toLowerCase();
  const rp = rel.toLowerCase();
  let score = 0;
  if (fn === q) score += 100;
  else if (fn.startsWith(q)) score += 80;
  else if (fn.includes(q)) score += 50;
  if (rp.includes(q)) score += 20;
  if (layerSuffix && fn.includes(layerSuffix.toLowerCase())) score += 10;
  return score;
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
      if (input.suffix && !(layer.suffix ?? "").includes(input.suffix)) {
        continue;
      }

      const rel = toRelativePath(workspaceRoot, path);
      const fileName = basename(path);

      let inferredRole = layer.id;
      for (const [role, pattern] of Object.entries(manifest.naming)) {
        if (pattern.includes(layer.suffix ?? "") || role.includes(layer.id)) {
          inferredRole = role;
          break;
        }
      }

      if (input.role && inferredRole !== input.role && layer.id !== input.role) {
        continue;
      }

      const score = scoreMatch(query, fileName, rel, layer.suffix);
      if (score <= 0 && query.length > 0) continue;

      matches.push({
        path: rel,
        layerId: layer.id,
        inferredRole,
        score,
      });
    }

    matches.sort((a, b) => b.score - a.score);
    return { matches: matches.slice(0, limit) };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
