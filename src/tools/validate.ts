import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { globAllLayerFiles } from "../utils/glob.js";
import { buildLayerFileMap, inferLayerForFile } from "../utils/layers.js";
import { checkLayerDependencies } from "../utils/layerDeps.js";
import { extractJavaImports, matchesImportPattern as matchJava } from "../utils/javaImportScan.js";
import { extractTsImports, matchesImportPattern as matchTs } from "../utils/tsImportScan.js";
import { toRelativePath } from "../utils/paths.js";
import { runCommand } from "../utils/subprocess.js";

export interface ArcValidateInput {
  workspaceRoot?: string;
  paths?: string[];
  runValidators?: boolean;
}

export interface Violation {
  ruleId: string;
  file: string;
  message: string;
  severity?: "error" | "warn";
}

export async function arcValidate(input: ArcValidateInput): Promise<{
  violations: Violation[];
  validatorResults?: Array<{
    id: string;
    exitCode: number;
    stdout?: string;
    stderr?: string;
  }>;
}> {
  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);
    const violations: Violation[] = [];
    const layerFileMap = await buildLayerFileMap(workspaceRoot, manifest);

    let filesToCheck: string[] = [];
    if (input.paths?.length) {
      filesToCheck = input.paths.map((p) => resolve(workspaceRoot, p));
    } else {
      const all = await globAllLayerFiles(workspaceRoot, manifest);
      filesToCheck = all.map((f) => f.path);
    }

    const layerDepViolations = await checkLayerDependencies(
      workspaceRoot,
      manifest,
      filesToCheck,
      layerFileMap
    );
    violations.push(...layerDepViolations);

    for (const absPath of filesToCheck) {
      const rel = toRelativePath(workspaceRoot, absPath);
      let content: string;
      try {
        content = readFileSync(absPath, "utf-8");
      } catch {
        continue;
      }

      const layer = inferLayerForFile(
        workspaceRoot,
        manifest,
        absPath,
        layerFileMap
      );
      const isJava = absPath.endsWith(".java");
      const isTs = /\.(ts|tsx|js|jsx)$/.test(absPath);
      const imports = isJava
        ? extractJavaImports(content)
        : isTs
          ? extractTsImports(content)
          : [];

      for (const rule of manifest.rules ?? []) {
        const whenLayers = rule.when?.layer;
        if (whenLayers && layer) {
          const ids = Array.isArray(whenLayers) ? whenLayers : [whenLayers];
          if (!ids.includes(layer.id)) continue;
        } else if (whenLayers && !layer) {
          continue;
        }

        const severity = rule.severity ?? "error";

        if (rule.forbidImports) {
          for (const imp of imports) {
            for (const pattern of rule.forbidImports) {
              const match = isJava ? matchJava(imp, pattern) : matchTs(imp, pattern);
              if (match) {
                violations.push({
                  ruleId: rule.id,
                  file: rel,
                  message: rule.message,
                  severity,
                });
              }
            }
          }
        }

        if (rule.requireSuffix) {
          const base = absPath.split("/").pop() ?? "";
          if (!base.endsWith(rule.requireSuffix)) {
            violations.push({
              ruleId: rule.id,
              file: rel,
              message: rule.message,
              severity,
            });
          }
        }

        if (rule.requireImplements) {
          const re = new RegExp(
            rule.requireImplements
              .replace(/\*/g, ".*")
              .replace(/\./g, "\\.")
          );
          if (!re.test(content)) {
            violations.push({
              ruleId: rule.id,
              file: rel,
              message: rule.message,
              severity,
            });
          }
        }
      }
    }

    let validatorResults:
      | Array<{ id: string; exitCode: number; stdout?: string; stderr?: string }>
      | undefined;

    if (input.runValidators) {
      validatorResults = [];
      for (const v of manifest.validators ?? []) {
        if (v.type !== "command") continue;
        try {
          const result = await runCommand(v.run, workspaceRoot);
          validatorResults.push({
            id: v.id,
            exitCode: result.exitCode,
            stdout: result.stdout.slice(0, 4000),
            stderr: result.stderr.slice(0, 4000),
          });
        } catch (e) {
          validatorResults.push({
            id: v.id,
            exitCode: 1,
            stderr: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    return { violations, validatorResults };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}

export function hasErrorViolations(violations: Violation[]): boolean {
  return violations.some((v) => (v.severity ?? "error") === "error");
}
