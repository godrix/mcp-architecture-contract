import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Handlebars from "handlebars";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { resolveKind } from "../core/resolveKind.js";
import { buildNamingContext } from "../utils/naming.js";
import { getLayerById } from "../utils/layers.js";

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

function compileTemplate(
  workspaceRoot: string,
  templateRel: string,
  ctx: Record<string, string>
): string {
  const paths = [
    resolve(workspaceRoot, templateRel),
    resolve(workspaceRoot, ".arc/templates", templateRel.replace(/^\.arc\/templates\//, "")),
  ];
  for (const p of paths) {
    try {
      const raw = readFileSync(p, "utf-8");
      return Handlebars.compile(raw)(ctx);
    } catch {
      continue;
    }
  }
  throw new Error(`Template não encontrado: ${templateRel}`);
}

export function arcScaffold(input: ArcScaffoldInput): ArcScaffoldOutput {
  const dryRun = input.dryRun !== false;
  const overwrite = input.overwrite ?? false;
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);
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
        const content = compileTemplate(workspaceRoot, file.template, hbCtx);
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
