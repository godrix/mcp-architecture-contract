import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { arcFind } from "./find.js";

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
          chain.push({
            role: art.role,
            path: art.path ?? "",
            layerId: art.role,
          });
        }
        return { chain, inferred: false };
      }
    }

    const query =
      input.className ??
      input.entry?.split("/").pop() ??
      input.slice ??
      "";
    if (!query) {
      return { chain: [], inferred: true };
    }

    const { matches } = await arcFind({
      workspaceRoot: input.workspaceRoot ?? workspaceRoot,
      query,
      limit: 20,
    });

    const chain: TraceChainItem[] = matches.map((m) => ({
      role: m.inferredRole,
      path: m.path,
      layerId: m.layerId,
    }));

    return { chain, inferred: true };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
