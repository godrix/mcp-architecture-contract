import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { resolveKind } from "../core/resolveKind.js";

export interface ArcRegisterSliceInput {
  workspaceRoot?: string;
  slice: string;
  kind: string;
  name: string;
  entry?: string;
}

export function arcRegisterSlice(input: ArcRegisterSliceInput) {
  try {
    const { manifest, manifestPath, workspaceRoot } = getLoadedManifest(
      input.workspaceRoot
    );
    const { files } = resolveKind(workspaceRoot, manifest, input.kind, input.name);

    const raw = parseYaml(readFileSync(manifestPath, "utf-8")) as Record<
      string,
      unknown
    >;
    const slices = (raw.slices as Record<string, unknown>) ?? {};

    slices[input.slice] = {
      entry: input.entry,
      artifacts: files.map((f) => ({
        role: f.role,
        path: f.relativePath,
      })),
    };

    raw.slices = slices;
    writeFileSync(manifestPath, stringifyYaml(raw).trimEnd() + "\n", "utf-8");

    return {
      slice: input.slice,
      manifestPath,
      artifacts: files.length,
      message: `Slice ${input.slice} registrado em arc.yaml`,
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
