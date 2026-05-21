import type { ArcManifest, Layer } from "../manifest/schema.js";

export interface NamingContext {
  Name: string;
  name: string;
  package: string;
  layer: string;
  projectName: string;
}

export function toCamelCase(pascal: string): string {
  if (!pascal) return pascal;
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function buildNamingContext(
  manifest: ArcManifest,
  name: string,
  layer?: Layer
): NamingContext {
  const rootPackage = manifest.project.rootPackage ?? "";
  const packagePath = rootPackage.replace(/\./g, "/");

  return {
    Name: name,
    name: toCamelCase(name),
    package: packagePath,
    layer: layer?.id ?? "",
    projectName: manifest.project.name,
  };
}

export function applyNamingTemplate(
  template: string,
  ctx: NamingContext
): string {
  return template
    .replace(/\{Name\}/g, ctx.Name)
    .replace(/\{name\}/g, ctx.name)
    .replace(/\{package\}/g, ctx.package)
    .replace(/\{layer\}/g, ctx.layer)
    .replace(/\{projectName\}/g, ctx.projectName);
}

export function resolveNamingKey(
  manifest: ArcManifest,
  namingKey: string | undefined,
  roleFallback: string
): string {
  if (namingKey && manifest.naming[namingKey]) {
    return namingKey;
  }
  if (manifest.naming[roleFallback]) {
    return roleFallback;
  }
  const keys = Object.keys(manifest.naming);
  const match = keys.find(
    (k) => k.toLowerCase() === roleFallback.toLowerCase()
  );
  return match ?? namingKey ?? roleFallback;
}
