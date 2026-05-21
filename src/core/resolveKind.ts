import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ArcManifest } from "../manifest/schema.js";
import {
  applyNamingTemplate,
  buildNamingContext,
  resolveNamingKey,
} from "../utils/naming.js";
import { getLayerById } from "../utils/layers.js";
import { toRelativePath } from "../utils/paths.js";

export interface ResolvedFile {
  role: string;
  layer: string;
  relativePath: string;
  template: string;
  exists: boolean;
}

export interface ResolveKindResult {
  files: ResolvedFile[];
  manualSteps: string[];
}

export function resolveKind(
  workspaceRoot: string,
  manifest: ArcManifest,
  kind: string,
  name: string
): ResolveKindResult {
  const kindDef = manifest.kinds[kind];
  if (!kindDef) {
    throw new Error(`Kind não encontrado: ${kind}. Disponíveis: ${Object.keys(manifest.kinds).join(", ")}`);
  }

  const files: ResolvedFile[] = [];
  const manualSteps: string[] = [];

  for (const step of kindDef.steps ?? []) {
    if ("manual" in step) {
      manualSteps.push(step.manual);
      continue;
    }

    const gen = step.generate;
    const layer = getLayerById(manifest, gen.layer);
    if (!layer) {
      throw new Error(`Layer não encontrada: ${gen.layer}`);
    }

    const namingKey = resolveNamingKey(
      manifest,
      gen.namingKey,
      gen.layer
    );
    const namingTemplate = manifest.naming[namingKey];
    if (!namingTemplate) {
      throw new Error(`Naming key não encontrada: ${namingKey}`);
    }

    const ctx = buildNamingContext(manifest, name, layer);
    const relativePath = applyNamingTemplate(namingTemplate, ctx);
    const absolutePath = resolve(workspaceRoot, relativePath);

    files.push({
      role: namingKey,
      layer: gen.layer,
      relativePath: toRelativePath(workspaceRoot, absolutePath),
      template: gen.template,
      exists: existsSync(absolutePath),
    });

    if (kindDef.tests?.mirror) {
      let testPath = relativePath;
      for (const rep of kindDef.tests.pathReplace ?? [
        { from: "/src/main/java/", to: "/src/test/java/" },
        { from: "/src/main/", to: "/src/test/" },
        { from: "src/", to: "src/" },
      ]) {
        testPath = testPath.replace(rep.from, rep.to);
      }
      if (!testPath.endsWith("Test.java") && !testPath.endsWith(".test.ts")) {
        const ext = testPath.includes(".java") ? ".java" : ".ts";
        testPath = testPath.replace(
          ext,
          ext === ".java" ? "Test.java" : ".test.ts"
        );
      }
      const testAbs = resolve(workspaceRoot, testPath);
      files.push({
        role: `${namingKey}_test`,
        layer: gen.layer,
        relativePath: toRelativePath(workspaceRoot, testAbs),
        template: gen.template.replace(/\.hbs$/, "Test.hbs"),
        exists: existsSync(testAbs),
      });
    }
  }

  return { files, manualSteps };
}
