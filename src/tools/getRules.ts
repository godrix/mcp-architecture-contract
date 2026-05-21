import { readFileSync } from "node:fs";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { globDocs } from "../utils/glob.js";
import { toRelativePath } from "../utils/paths.js";

const MAX_SNIPPET_BYTES = 8192;

export interface ArcGetRulesInput {
  workspaceRoot?: string;
  layerId?: string;
}

export interface ArcGetRulesOutput {
  layers: unknown[];
  rules: unknown[];
  docPaths: string[];
  snippets?: Record<string, string>;
}

export async function arcGetRules(
  input: ArcGetRulesInput
): Promise<ArcGetRulesOutput> {
  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);

    const layers = input.layerId
      ? manifest.layers.filter((l) => l.id === input.layerId)
      : manifest.layers;

    const rules = input.layerId
      ? (manifest.rules ?? []).filter((r) => {
          const whenLayer = r.when?.layer;
          if (!whenLayer) return true;
          const ids = Array.isArray(whenLayer) ? whenLayer : [whenLayer];
          return ids.includes(input.layerId!);
        })
      : manifest.rules ?? [];

    const docAbs = await globDocs(workspaceRoot, manifest.docs ?? []);
    const docPaths = docAbs.map((p) => toRelativePath(workspaceRoot, p));

    const snippets: Record<string, string> = {};
    for (const docPath of docPaths.slice(0, 20)) {
      const abs = `${workspaceRoot}/${docPath}`.replace(/\/+/g, "/");
      try {
        const content = readFileSync(abs, "utf-8");
        snippets[docPath] = content.slice(0, MAX_SNIPPET_BYTES);
      } catch {
        /* skip unreadable */
      }
    }

    return {
      layers,
      rules,
      docPaths,
      snippets: Object.keys(snippets).length ? snippets : undefined,
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
