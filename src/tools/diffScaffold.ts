import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { resolveKind } from "../core/resolveKind.js";
import { buildNamingContext } from "../utils/naming.js";
import { getLayerById } from "../utils/layers.js";
import { readAndCompileTemplate } from "../utils/templates.js";

export interface ArcDiffScaffoldInput {
  workspaceRoot?: string;
  kind: string;
  name: string;
}

function simpleDiff(existing: string, proposed: string): string[] {
  const oldLines = existing.split("\n");
  const newLines = proposed.split("\n");
  const lines: string[] = [];
  const max = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      if (o !== undefined) lines.push(`  ${o}`);
    } else {
      if (o !== undefined) lines.push(`- ${o}`);
      if (n !== undefined) lines.push(`+ ${n}`);
    }
  }
  return lines;
}

export function arcDiffScaffold(input: ArcDiffScaffoldInput) {
  try {
    const { manifest, workspaceRoot, pluginRoots } = getLoadedManifest(
      input.workspaceRoot
    );
    const { files, manualSteps } = resolveKind(
      workspaceRoot,
      manifest,
      input.kind,
      input.name
    );

    const diffs = files.map((file) => {
      const layer = getLayerById(manifest, file.layer);
      const ctx = buildNamingContext(manifest, input.name, layer);
      const hbCtx: Record<string, string> = {
        Name: ctx.Name,
        name: ctx.name,
        package: ctx.package,
        layer: ctx.layer,
        projectName: ctx.projectName,
      };

      let proposed = "";
      try {
        proposed = readAndCompileTemplate(
          workspaceRoot,
          file.template,
          hbCtx,
          pluginRoots
        );
      } catch (e) {
        return {
          path: file.relativePath,
          exists: file.exists,
          error: e instanceof Error ? e.message : String(e),
        };
      }

      const abs = resolve(workspaceRoot, file.relativePath);
      if (!existsSync(abs)) {
        return {
          path: file.relativePath,
          exists: false,
          action: "create" as const,
          preview: proposed.split("\n").slice(0, 40),
        };
      }

      const existing = readFileSync(abs, "utf-8");
      return {
        path: file.relativePath,
        exists: true,
        action: existing === proposed ? ("unchanged" as const) : ("modify" as const),
        diff: simpleDiff(existing, proposed).slice(0, 80),
      };
    });

    return { kind: input.kind, name: input.name, manualSteps, diffs };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
