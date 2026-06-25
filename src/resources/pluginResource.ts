import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { getLoadedManifest } from "../context.js";

export function readPluginResource(
  pluginId: string,
  workspaceRoot?: string
): {
  id: string;
  manifestPath: string;
  manifest: unknown;
  templates: string[];
} {
  const { workspaceRoot: root } = getLoadedManifest(workspaceRoot);
  const pluginDir = join(root, ".arc/plugins", pluginId);
  const manifestPath = join(pluginDir, "manifest.yaml");

  if (!existsSync(manifestPath)) {
    throw new Error(
      `Plugin não encontrado: ${pluginId}. Use arc://plugins para listar ids disponíveis.`
    );
  }

  const manifest = parseYaml(readFileSync(manifestPath, "utf-8"));
  const templatesDir = join(pluginDir, "templates");
  const templates: string[] = [];

  if (existsSync(templatesDir) && statSync(templatesDir).isDirectory()) {
    for (const entry of readdirSync(templatesDir)) {
      if (entry.endsWith(".hbs")) {
        templates.push(`.arc/plugins/${pluginId}/templates/${entry}`);
      }
    }
  }

  return {
    id: pluginId,
    manifestPath: `.arc/plugins/${pluginId}/manifest.yaml`,
    manifest,
    templates,
  };
}
