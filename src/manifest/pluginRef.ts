import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export type ExtendsRefType = "preset" | "file";

export interface ParsedExtendsRef {
  type: ExtendsRefType;
  ref: string;
  resolvedPath?: string;
}

const YAML_EXT = /\.(ya?ml)$/i;

export function isPresetRef(ref: string): boolean {
  const trimmed = ref.trim();
  if (YAML_EXT.test(trimmed)) return false;
  if (trimmed.includes("/") || trimmed.includes("\\")) return false;
  return trimmed.includes("@");
}

export function parseExtendsRef(ref: string, baseDir: string): ParsedExtendsRef {
  const trimmed = ref.trim();
  if (!trimmed) {
    throw new Error("extends vazio");
  }

  if (isPresetRef(trimmed)) {
    return { type: "preset", ref: trimmed };
  }

  const resolvedPath = isAbsolute(trimmed)
    ? resolve(trimmed)
    : resolve(baseDir, trimmed);

  if (!existsSync(resolvedPath)) {
    throw new Error(`extends não encontrado: ${resolvedPath}`);
  }

  return { type: "file", ref: trimmed, resolvedPath };
}

export function pluginRootFromManifestPath(manifestPath: string): string {
  return dirname(manifestPath);
}
