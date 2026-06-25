import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ArcManifest, Layer } from "../manifest/schema.js";
import { inferLayerForFile } from "./layers.js";
import { extractJavaImports } from "./javaImportScan.js";
import { extractTsImports } from "./tsImportScan.js";
import { sourceRoot } from "./paths.js";
import { globAllLayerFiles } from "./glob.js";
import type { Violation } from "../tools/validate.js";

function importToJavaRelative(importPath: string): string {
  if (importPath.endsWith(".*")) {
    return importPath.slice(0, -2).replace(/\./g, "/");
  }
  return importPath.replace(/\./g, "/") + ".java";
}

export async function buildJavaClassIndex(
  workspaceRoot: string,
  manifest: ArcManifest
): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  const root = resolve(workspaceRoot, sourceRoot(manifest));
  const all = await globAllLayerFiles(workspaceRoot, manifest);

  for (const { path } of all) {
    if (!path.endsWith(".java")) continue;
    const rel = path.slice(root.length + 1).replace(/\\/g, "/");
    const withoutExt = rel.replace(/\.java$/, "");
    const fqn = withoutExt.replace(/\//g, ".");
    index.set(fqn, path);
    const simple = withoutExt.split("/").pop();
    if (simple && !index.has(simple)) {
      index.set(simple, path);
    }
  }
  return index;
}

function resolveImportTargetPath(
  importPath: string,
  isJava: boolean,
  workspaceRoot: string,
  manifest: ArcManifest,
  javaIndex: Map<string, string>
): string | undefined {
  if (isJava) {
    if (importPath.endsWith(".*")) return undefined;
    const direct = javaIndex.get(importPath);
    if (direct) return direct;
    const simple = importPath.split(".").pop();
    if (simple) {
      const bySimple = javaIndex.get(simple);
      if (bySimple) return bySimple;
    }
    const rel = importToJavaRelative(importPath);
    const candidate = resolve(workspaceRoot, sourceRoot(manifest), rel);
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      return undefined;
    }
  }

  const rel = importPath.replace(/^\.\//, "");
  const candidates = [
    resolve(workspaceRoot, rel),
    resolve(workspaceRoot, rel + ".ts"),
    resolve(workspaceRoot, rel + ".tsx"),
    resolve(workspaceRoot, rel, "index.ts"),
  ];
  for (const c of candidates) {
    try {
      readFileSync(c);
      return c;
    } catch {
      continue;
    }
  }
  return undefined;
}

function layerDepMessage(
  source: Layer,
  target: Layer,
  kind: "mayDependOn" | "mustNotDependOn"
): string {
  if (kind === "mustNotDependOn") {
    return `Layer ${source.id} não pode depender de ${target.id}`;
  }
  const allowed = source.mayDependOn?.join(", ") ?? "(nenhuma declarada)";
  return `Layer ${source.id} só pode depender de [${allowed}], mas importa de ${target.id}`;
}

export async function checkLayerDependencies(
  workspaceRoot: string,
  manifest: ArcManifest,
  filesToCheck: string[],
  layerFileMap: Map<string, Layer>
): Promise<Violation[]> {
  const violations: Violation[] = [];
  const javaIndex = await buildJavaClassIndex(workspaceRoot, manifest);

  for (const absPath of filesToCheck) {
    const sourceLayer = inferLayerForFile(
      workspaceRoot,
      manifest,
      absPath,
      layerFileMap
    );
    if (!sourceLayer) continue;

    const isJava = absPath.endsWith(".java");
    const isTs = /\.(ts|tsx|js|jsx)$/.test(absPath);
    if (!isJava && !isTs) continue;

    let content: string;
    try {
      content = readFileSync(absPath, "utf-8");
    } catch {
      continue;
    }

    const imports = isJava
      ? extractJavaImports(content)
      : extractTsImports(content);

    const rel = absPath.startsWith(workspaceRoot)
      ? absPath.slice(workspaceRoot.length + 1).replace(/\\/g, "/")
      : absPath;

    for (const imp of imports) {
      const targetPath = resolveImportTargetPath(
        imp,
        isJava,
        workspaceRoot,
        manifest,
        javaIndex
      );
      if (!targetPath) continue;

      const targetLayer = inferLayerForFile(
        workspaceRoot,
        manifest,
        targetPath,
        layerFileMap
      );
      if (!targetLayer) continue;
      if (targetLayer.id === sourceLayer.id) continue;

      if (sourceLayer.mustNotDependOn?.includes(targetLayer.id)) {
        violations.push({
          ruleId: `layer-deps-${sourceLayer.id}->${targetLayer.id}`,
          file: rel,
          message: layerDepMessage(sourceLayer, targetLayer, "mustNotDependOn"),
        });
        continue;
      }

      if (
        sourceLayer.mayDependOn?.length &&
        !sourceLayer.mayDependOn.includes(targetLayer.id)
      ) {
        violations.push({
          ruleId: `layer-deps-${sourceLayer.id}->${targetLayer.id}`,
          file: rel,
          message: layerDepMessage(sourceLayer, targetLayer, "mayDependOn"),
        });
      }
    }
  }

  return violations;
}
