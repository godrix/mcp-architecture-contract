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
import { resolveWorkspaceRoot } from "../context.js";
import { parsePresetRef } from "../manifest/loader.js";

export interface ArcInitInput {
  workspaceRoot?: string;
  preset: string;
  force?: boolean;
}

export interface ArcInitOutput {
  created: string[];
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

export function arcInit(input: ArcInitInput): ArcInitOutput {
  const workspaceRoot = resolve(resolveWorkspaceRoot(input.workspaceRoot));
  const manifestPath = join(workspaceRoot, "arc.yaml");
  const force = input.force ?? false;

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

  const presetYaml = readFileSync(presetFile, "utf-8");
  writeFileSync(manifestPath, presetYaml, "utf-8");

  const created: string[] = ["arc.yaml"];
  const templatesSrc = join(getPackageRoot(), "templates", id);
  const templatesDest = join(workspaceRoot, ".arc/templates");
  copyDirRecursive(templatesSrc, templatesDest, created, workspaceRoot);

  return {
    created,
    preset: presetRef,
    message: `Manifesto ${presetRef} criado em ${workspaceRoot}`,
  };
}
