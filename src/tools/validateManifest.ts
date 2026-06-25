import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { ZodError } from "zod";
import {
  findManifestPath,
  isPresetRef,
  loadManifest,
  loadPresetFile,
  parseExtendsRef,
} from "../manifest/loader.js";
import {
  arcManifestSchema,
  arcPluginManifestSchema,
} from "../manifest/schema.js";
import { manifestErrorMessage } from "../context.js";

export interface ArcValidateManifestInput {
  workspaceRoot?: string;
}

export interface ManifestValidationIssue {
  path: string;
  field?: string;
  message: string;
}

function zodIssues(path: string, err: ZodError): ManifestValidationIssue[] {
  return err.issues.map((issue) => ({
    path,
    field: issue.path.join("."),
    message: issue.message,
  }));
}

function scanPluginManifests(pluginsDir: string): string[] {
  if (!statSync(pluginsDir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }
  const found: string[] = [];
  for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(pluginsDir, entry.name, "manifest.yaml");
    try {
      if (statSync(manifestPath).isFile()) {
        found.push(manifestPath);
      }
    } catch {
      /* skip */
    }
  }
  return found;
}

export function arcValidateManifest(input: ArcValidateManifestInput): {
  valid: boolean;
  manifestPath?: string;
  extendsRef?: string;
  pluginRoots?: string[];
  issues: ManifestValidationIssue[];
} {
  try {
    const root = resolve(input.workspaceRoot ?? process.cwd());
    const manifestPath = findManifestPath(root);
    if (!manifestPath) {
      return {
        valid: false,
        issues: [{ path: root, message: "arc.yaml não encontrado" }],
      };
    }

    const loaded = loadManifest(root);
    const issues: ManifestValidationIssue[] = [];

    try {
      arcManifestSchema.parse(loaded.manifest);
    } catch (e) {
      if (e instanceof ZodError) {
        issues.push(...zodIssues(loaded.manifestPath, e));
      } else {
        issues.push({
          path: loaded.manifestPath,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (loaded.extendsRef) {
      if (isPresetRef(loaded.extendsRef)) {
        try {
          loadPresetFile(loaded.extendsRef);
        } catch (e) {
          issues.push({
            path: loaded.manifestPath,
            field: "extends",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      } else {
        try {
          parseExtendsRef(loaded.extendsRef, dirname(loaded.manifestPath));
        } catch (e) {
          issues.push({
            path: loaded.manifestPath,
            field: "extends",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    const pluginsDir = join(loaded.workspaceRoot, ".arc/plugins");
    for (const pluginManifest of scanPluginManifests(pluginsDir)) {
      try {
        const parsed = parseYaml(readFileSync(pluginManifest, "utf-8"));
        arcPluginManifestSchema.parse(parsed);
      } catch (e) {
        if (e instanceof ZodError) {
          issues.push(...zodIssues(pluginManifest, e));
        } else {
          issues.push({
            path: pluginManifest,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    return {
      valid: issues.length === 0,
      manifestPath: loaded.manifestPath,
      extendsRef: loaded.extendsRef,
      pluginRoots: loaded.pluginRoots,
      issues,
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
