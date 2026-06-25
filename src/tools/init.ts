import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as stringifyYaml } from "yaml";
import { resolveWorkspaceRoot } from "../context.js";
import { withArcYamlSchemaDirective } from "../manifest/arcYamlHeader.js";
import { loadPresetFile, parsePresetRef } from "../manifest/loader.js";

const ARC_SCHEMA_FILES = ["arc-manifest.schema.json", "schema.json"] as const;

export interface ArcInitInput {
  workspaceRoot?: string;
  preset: string;
  force?: boolean;
  mode?: "thin" | "full";
  projectName?: string;
  rootPackage?: string;
}

export interface ArcInitOutput {
  created: string[];
  preset: string;
  message: string;
  mode: "thin" | "full";
}

export interface ArcInitPluginInput {
  workspaceRoot?: string;
  pluginId: string;
  preset: string;
  force?: boolean;
}

export interface ArcInitPluginOutput {
  created: string[];
  pluginId: string;
  preset: string;
  message: string;
}

function getPackageRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "..", "..");
}

function copyDirRecursive(
  src: string,
  dest: string,
  created: string[],
  workspaceRoot: string
) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, created, workspaceRoot);
    } else {
      copyFileSync(srcPath, destPath);
      const rel = destPath
        .slice(workspaceRoot.length + 1)
        .replace(/\\/g, "/");
      created.push(rel);
    }
  }
}

function buildThinArcYaml(input: {
  presetRef: string;
  projectName: string;
  language: string;
  rootPackage?: string;
}): string {
  const body = stringifyYaml({
    schemaVersion: "1",
    extends: input.presetRef,
    project: {
      name: input.projectName,
      language: input.language,
      ...(input.rootPackage ? { rootPackage: input.rootPackage } : {}),
      sourceRoot: ".",
    },
  });
  return withArcYamlSchemaDirective(body.trimEnd() + "\n");
}

function copyArcSchemas(workspaceRoot: string, created: string[]): void {
  const arcDir = join(workspaceRoot, ".arc");
  mkdirSync(arcDir, { recursive: true });
  const packageArc = join(getPackageRoot(), ".arc");
  for (const schemaFile of ARC_SCHEMA_FILES) {
    const src = join(packageArc, schemaFile);
    if (existsSync(src)) {
      const dest = join(arcDir, schemaFile);
      copyFileSync(src, dest);
      created.push(`.arc/${schemaFile}`);
    }
  }
}

export function arcInit(input: ArcInitInput): ArcInitOutput {
  const workspaceRoot = resolve(resolveWorkspaceRoot(input.workspaceRoot));
  const manifestPath = join(workspaceRoot, "arc.yaml");
  const force = input.force ?? false;
  const mode = input.mode ?? "thin";

  if (existsSync(manifestPath) && !force) {
    throw new Error(
      `arc.yaml já existe em ${workspaceRoot}. Use force=true para sobrescrever.`
    );
  }

  const presetRef = input.preset.includes("@")
    ? input.preset
    : `${input.preset}@1`;

  const { id } = parsePresetRef(presetRef);
  const presetFile = join(getPackageRoot(), "presets", `${presetRef}.yaml`);
  if (!existsSync(presetFile)) {
    throw new Error(`Preset não encontrado: ${presetFile}`);
  }

  const preset = loadPresetFile(presetRef);
  const created: string[] = [];

  if (mode === "full") {
    const presetYaml = readFileSync(presetFile, "utf-8");
    writeFileSync(manifestPath, withArcYamlSchemaDirective(presetYaml), "utf-8");
  } else {
    const thinYaml = buildThinArcYaml({
      presetRef,
      projectName: input.projectName ?? preset.project?.name ?? "my-service",
      language: preset.project?.language ?? "java",
      rootPackage:
        input.rootPackage ??
        preset.project?.rootPackage ??
        "com.example.myapp",
    });
    writeFileSync(manifestPath, thinYaml, "utf-8");
  }
  created.push("arc.yaml");

  copyArcSchemas(workspaceRoot, created);

  const templatesSrc = join(getPackageRoot(), "templates", id);
  const templatesDest = join(workspaceRoot, ".arc/templates");
  copyDirRecursive(templatesSrc, templatesDest, created, workspaceRoot);

  return {
    created,
    preset: presetRef,
    mode,
    message: `Manifesto ${presetRef} criado em ${workspaceRoot} (mode=${mode})`,
  };
}

export function arcInitPlugin(input: ArcInitPluginInput): ArcInitPluginOutput {
  const workspaceRoot = resolve(resolveWorkspaceRoot(input.workspaceRoot));
  const pluginId = input.pluginId.trim();
  if (!pluginId || /[/\\]/.test(pluginId)) {
    throw new Error("pluginId inválido");
  }

  const presetRef = input.preset.includes("@")
    ? input.preset
    : `${input.preset}@1`;
  const { id } = parsePresetRef(presetRef);
  const presetFile = join(getPackageRoot(), "presets", `${presetRef}.yaml`);
  if (!existsSync(presetFile)) {
    throw new Error(`Preset não encontrado: ${presetFile}`);
  }

  const pluginDir = join(workspaceRoot, ".arc/plugins", pluginId);
  const manifestPath = join(pluginDir, "manifest.yaml");
  const force = input.force ?? false;

  if (existsSync(manifestPath) && !force) {
    throw new Error(
      `Plugin já existe em ${manifestPath}. Use force=true para sobrescrever.`
    );
  }

  const preset = loadPresetFile(presetRef);
  const { project: _project, ...pluginBody } = preset;
  const manifestBody = stringifyYaml({
    ...pluginBody,
    extends: presetRef,
  });

  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(manifestPath, manifestBody.trimEnd() + "\n", "utf-8");

  const created: string[] = [
    `.arc/plugins/${pluginId}/manifest.yaml`,
  ];

  const templatesSrc = join(getPackageRoot(), "templates", id);
  const templatesDest = join(pluginDir, "templates");
  copyDirRecursive(templatesSrc, templatesDest, created, workspaceRoot);

  return {
    created,
    pluginId,
    preset: presetRef,
    message: `Plugin ${pluginId} criado em ${pluginDir}`,
  };
}
