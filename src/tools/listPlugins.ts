import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { getLoadedManifest, manifestErrorMessage } from "../context.js";

export interface ArcListPluginsInput {
  workspaceRoot?: string;
}

export function arcListPlugins(input: ArcListPluginsInput = {}) {
  try {
    const { workspaceRoot } = getLoadedManifest(input.workspaceRoot);
    const pluginsDir = join(workspaceRoot, ".arc/plugins");
    const plugins: Array<{
      id: string;
      manifestPath: string;
      profile?: string;
      extends?: string;
    }> = [];

    try {
      if (!statSync(pluginsDir).isDirectory()) {
        return { plugins };
      }
    } catch {
      return { plugins };
    }

    for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(pluginsDir, entry.name, "manifest.yaml");
      try {
        if (!statSync(manifestPath).isFile()) continue;
        const raw = parseYaml(readFileSync(manifestPath, "utf-8")) as Record<
          string,
          unknown
        >;
        plugins.push({
          id: entry.name,
          manifestPath: resolve(manifestPath).slice(workspaceRoot.length + 1),
          profile: raw.profile as string | undefined,
          extends: raw.extends as string | undefined,
        });
      } catch {
        plugins.push({
          id: entry.name,
          manifestPath: `.arc/plugins/${entry.name}/manifest.yaml`,
        });
      }
    }

    return { plugins };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
