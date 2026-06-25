import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { resolveKind } from "../core/resolveKind.js";
import { buildNamingContext } from "../utils/naming.js";
import { getLayerById } from "../utils/layers.js";
import { readAndCompileTemplate } from "../utils/templates.js";

export interface ArcScaffoldInput {
  workspaceRoot?: string;
  kind: string;
  name: string;
  dryRun?: boolean;
  overwrite?: boolean;
}

export interface ArcScaffoldOutput {
  dryRun: boolean;
  created: string[];
  skipped: string[];
  errors: string[];
  manualSteps: string[];
}

export function arcScaffold(input: ArcScaffoldInput): ArcScaffoldOutput {
  const dryRun = input.dryRun !== false;
  const overwrite = input.overwrite ?? false;
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

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

    for (const file of files) {
      if (file.exists && !overwrite) {
        skipped.push(file.relativePath);
        continue;
      }

      if (dryRun) {
        created.push(file.relativePath);
        continue;
      }

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
        const abs = resolve(workspaceRoot, file.relativePath);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, "utf-8");
        created.push(file.relativePath);
      } catch (e) {
        errors.push(
          `${file.relativePath}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return { dryRun, created, skipped, errors, manualSteps };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}

export { readAndCompileTemplate };
