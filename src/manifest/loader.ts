import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { mergeManifests } from "./merge.js";
import {
  isPresetRef,
  parseExtendsRef,
  pluginRootFromManifestPath,
} from "./pluginRef.js";
import {
  arcManifestSchema,
  arcPluginManifestSchema,
  type ArcManifest,
} from "./schema.js";

const MANIFEST_NAMES = ["arc.yaml", ".arc/config.yaml"] as const;
const MAX_EXTENDS_DEPTH = 8;

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
  pluginRoots: string[];
  extendsRef?: string;
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

function findPresetPath(presetRef: string): string {
  const filename = `${presetRef}.yaml`;
  const packageRoot = getPackageRoot();
  const candidates = [
    join(packageRoot, "presets", filename),
    join(packageRoot, "..", "presets", filename),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }
  throw new Error(`Preset não encontrado: ${presetRef} (procurado ${filename})`);
}

export function loadPresetFile(presetRef: string): ArcManifest {
  const path = findPresetPath(presetRef);
  const raw = parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
  delete raw.extends;
  delete raw.parent;
  return arcPluginManifestSchema.parse(raw) as ArcManifest;
}

function loadRawYaml(path: string): Record<string, unknown> {
  return parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

interface ChainLoadResult {
  manifest: ArcManifest;
  pluginRoots: string[];
}

function uniqueRoots(roots: string[]): string[] {
  return [...new Set(roots.map((r) => resolve(r)))];
}

function loadExtendsChain(
  extendsRef: string,
  baseDir: string,
  depth: number
): ChainLoadResult {
  if (depth > MAX_EXTENDS_DEPTH) {
    throw new Error(`Cadeia extends excede profundidade máxima (${MAX_EXTENDS_DEPTH})`);
  }

  const parsed = parseExtendsRef(extendsRef, baseDir);

  if (parsed.type === "preset") {
    const preset = loadPresetFile(parsed.ref);
    const { id } = parsePresetRef(parsed.ref);
    return {
      manifest: preset,
      pluginRoots: [join(getPackageRoot(), "templates", id)],
    };
  }

  const manifestPath = parsed.resolvedPath!;
  const raw = loadRawYaml(manifestPath);
  const dir = pluginRootFromManifestPath(manifestPath);
  const pluginRoots = [dir];

  const local = { ...raw };
  delete local.parent;
  delete local.extends;

  let merged: ArcManifest;

  if (raw.extends) {
    const parentChain = loadExtendsChain(String(raw.extends), dir, depth + 1);
    merged = mergeManifests(
      parentChain.manifest,
      local as Partial<ArcManifest>
    );
    pluginRoots.push(...parentChain.pluginRoots);
  } else {
    merged = local as unknown as ArcManifest;
  }

  arcPluginManifestSchema.parse(merged);

  return {
    manifest: merged,
    pluginRoots: uniqueRoots(pluginRoots),
  };
}

function loadFromFile(manifestPath: string): {
  manifest: ArcManifest;
  pluginRoots: string[];
  extendsRef?: string;
} {
  const raw = loadRawYaml(manifestPath);
  const dir = dirname(manifestPath);

  const local = { ...raw };
  delete local.parent;
  delete local.extends;

  let merged: ArcManifest;
  let pluginRoots: string[] = [];
  let extendsRef: string | undefined;

  if (raw.extends) {
    extendsRef = String(raw.extends);
    const chain = loadExtendsChain(extendsRef, dir, 0);
    merged = mergeManifests(chain.manifest, local as Partial<ArcManifest>);
    pluginRoots = chain.pluginRoots;
  } else {
    merged = local as unknown as ArcManifest;
  }

  if (raw.parent) {
    const parentPath = resolve(dir, String(raw.parent));
    if (!existsSync(parentPath)) {
      throw new Error(`Parent arc.yaml não encontrado: ${parentPath}`);
    }
    const parentResult = loadFromFile(parentPath);
    merged = mergeManifests(parentResult.manifest, merged);
    pluginRoots = uniqueRoots([...pluginRoots, ...parentResult.pluginRoots]);
  }

  merged = arcManifestSchema.parse(merged);

  return {
    manifest: merged,
    pluginRoots: uniqueRoots(pluginRoots),
    extendsRef,
  };
}

export function loadManifest(workspaceRoot?: string): LoadedManifest {
  const root = resolve(workspaceRoot ?? process.cwd());
  const manifestPath = findManifestPath(root);

  if (!manifestPath) {
    throw new ManifestNotFoundError(root);
  }

  const { manifest, pluginRoots, extendsRef } = loadFromFile(manifestPath);
  const workspaceRootResolved = dirname(manifestPath);

  return {
    manifest,
    manifestPath,
    workspaceRoot: workspaceRootResolved,
    pluginRoots,
    extendsRef,
  };
}

export function listPresetIds(): string[] {
  const presetsDir = join(getPackageRoot(), "presets");
  if (!existsSync(presetsDir)) return [];
  return readdirSync(presetsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));
}

export function getPresetMeta(presetRef: string): {
  ref: string;
  profile: string;
  description?: string;
} {
  const preset = loadPresetFile(presetRef);
  return {
    ref: presetRef,
    profile: preset.profile,
    description: preset.project?.name,
  };
}

export { isPresetRef, parseExtendsRef };
