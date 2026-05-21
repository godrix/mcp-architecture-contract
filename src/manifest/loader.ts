import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { mergeManifests } from "./merge.js";
import { arcManifestSchema, type ArcManifest } from "./schema.js";

const MANIFEST_NAMES = ["arc.yaml", ".arc/config.yaml"] as const;

export class ManifestNotFoundError extends Error {
  constructor(workspaceRoot: string) {
    super(
      `arc.yaml não encontrado a partir de ${workspaceRoot}. Execute arc_init para criar um manifesto.`
    );
    this.name = "ManifestNotFoundError";
  }
}

export interface LoadedManifest {
  manifest: ArcManifest;
  manifestPath: string;
  workspaceRoot: string;
}

function getPackageRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "..", "..");
}

export function findManifestPath(startDir: string): string | null {
  let dir = resolve(startDir);
  const root = resolve("/");

  while (true) {
    for (const name of MANIFEST_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    if (dir === root) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function parsePresetRef(ref: string): { id: string; version: string } {
  const at = ref.lastIndexOf("@");
  if (at <= 0) {
    throw new Error(`extends inválido: ${ref}. Use preset-id@version`);
  }
  return { id: ref.slice(0, at), version: ref.slice(at + 1) };
}

export function loadPresetFile(presetRef: string): ArcManifest {
  const filename = `${presetRef}.yaml`;
  const packageRoot = getPackageRoot();
  const candidates = [
    join(packageRoot, "presets", filename),
    join(packageRoot, "..", "presets", filename),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      const raw = parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
      delete raw.extends;
      return arcManifestSchema.parse(raw);
    }
  }
  throw new Error(`Preset não encontrado: ${presetRef} (procurado ${filename})`);
}

function loadRawYaml(path: string): Record<string, unknown> {
  return parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function loadFromFile(manifestPath: string): ArcManifest {
  const raw = loadRawYaml(manifestPath);
  const dir = dirname(manifestPath);

  const local = { ...raw };
  delete local.parent;
  delete local.extends;

  let merged: ArcManifest;

  if (raw.extends) {
    const preset = loadPresetFile(String(raw.extends));
    merged = mergeManifests(preset, local as Partial<ArcManifest>);
  } else {
    merged = local as unknown as ArcManifest;
  }

  if (raw.parent) {
    const parentPath = resolve(dir, String(raw.parent));
    if (!existsSync(parentPath)) {
      throw new Error(`Parent arc.yaml não encontrado: ${parentPath}`);
    }
    const parentManifest = loadFromFile(parentPath);
    merged = mergeManifests(parentManifest, merged);
  }

  return arcManifestSchema.parse(merged);
}

export function loadManifest(workspaceRoot?: string): LoadedManifest {
  const root = resolve(workspaceRoot ?? process.cwd());
  const manifestPath = findManifestPath(root);

  if (!manifestPath) {
    throw new ManifestNotFoundError(root);
  }

  const manifest = loadFromFile(manifestPath);
  const workspaceRootResolved = dirname(manifestPath);

  return {
    manifest,
    manifestPath,
    workspaceRoot: workspaceRootResolved,
  };
}

export function listPresetIds(): string[] {
  const presetsDir = join(getPackageRoot(), "presets");
  if (!existsSync(presetsDir)) return [];
  return readdirSync(presetsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));
}
