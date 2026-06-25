import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { arcFind } from "./find.js";
import { globAllLayerFiles } from "../utils/glob.js";
import { buildLayerFileMap, inferLayerForFile } from "../utils/layers.js";
import { extractJavaImports } from "../utils/javaImportScan.js";
import { buildJavaClassIndex } from "../utils/layerDeps.js";
import { toRelativePath } from "../utils/paths.js";

export interface ArcTraceInput {
  workspaceRoot?: string;
  slice?: string;
  entry?: string;
  className?: string;
}

export interface TraceChainItem {
  role: string;
  path: string;
  layerId: string;
  via?: "slice" | "find" | "import";
}

export async function arcTrace(input: ArcTraceInput): Promise<{
  chain: TraceChainItem[];
  inferred: boolean;
}> {
  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);

    if (manifest.slices && input.slice) {
      const sliceDef = manifest.slices[input.slice];
      if (sliceDef?.artifacts) {
        const chain: TraceChainItem[] = [];
        for (const art of sliceDef.artifacts) {
          const layer = manifest.layers.find((l) => l.id === art.role);
          chain.push({
            role: art.role,
            path: art.path ?? "",
            layerId: layer?.id ?? art.role,
            via: "slice",
          });
        }
        return { chain, inferred: false };
      }
    }

    const query =
      input.className ??
      input.entry?.split("/").pop()?.replace(/\.(java|ts|tsx)$/, "") ??
      input.slice ??
      "";
    if (!query) {
      return { chain: [], inferred: true };
    }

    const { matches } = await arcFind({
      workspaceRoot: input.workspaceRoot ?? workspaceRoot,
      query,
      limit: 5,
    });

    if (matches.length === 0) {
      return { chain: [], inferred: true };
    }

    const seed = matches[0];
    const chain: TraceChainItem[] = [
      {
        role: seed.inferredRole,
        path: seed.path,
        layerId: seed.layerId,
        via: "find",
      },
    ];

    const layerFileMap = await buildLayerFileMap(workspaceRoot, manifest);
    const javaIndex = await buildJavaClassIndex(workspaceRoot, manifest);
    const absSeed = resolve(workspaceRoot, seed.path);

    try {
      const content = readFileSync(absSeed, "utf-8");
      const imports = absSeed.endsWith(".java")
        ? extractJavaImports(content)
        : [];

      for (const imp of imports) {
        const target = javaIndex.get(imp) ?? javaIndex.get(imp.split(".").pop() ?? "");
        if (!target) continue;
        const targetLayer = inferLayerForFile(
          workspaceRoot,
          manifest,
          target,
          layerFileMap
        );
        if (!targetLayer) continue;
        const rel = toRelativePath(workspaceRoot, target);
        if (chain.some((c) => c.path === rel)) continue;
        chain.push({
          role: targetLayer.suffix ?? targetLayer.id,
          path: rel,
          layerId: targetLayer.id,
          via: "import",
        });
      }
    } catch {
      /* seed unreadable */
    }

    const all = await globAllLayerFiles(workspaceRoot, manifest);
    const baseName = query.replace(/(UseCase|Controller|Port|Service)$/, "");
    if (baseName) {
      for (const { path, layer } of all) {
        const rel = toRelativePath(workspaceRoot, path);
        if (chain.some((c) => c.path === rel)) continue;
        if (path.includes(baseName)) {
          chain.push({
            role: layer.suffix ?? layer.id,
            path: rel,
            layerId: layer.id,
            via: "find",
          });
        }
      }
    }

    return { chain, inferred: true };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
