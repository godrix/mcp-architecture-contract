import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import Handlebars from "handlebars";

export function resolveTemplatePath(
  workspaceRoot: string,
  templateRel: string,
  pluginRoots: string[] = []
): string | null {
  const stripped = templateRel.replace(/^\.arc\/templates\//, "");
  const fileName = basename(stripped);

  const candidates = [
    resolve(workspaceRoot, templateRel),
    resolve(workspaceRoot, ".arc/templates", stripped),
    resolve(workspaceRoot, ".arc/templates", fileName),
    ...pluginRoots.flatMap((root) => [
      resolve(root, templateRel),
      resolve(root, stripped),
      resolve(root, "templates", stripped),
      resolve(root, "templates", fileName),
    ]),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function readAndCompileTemplate(
  workspaceRoot: string,
  templateRel: string,
  ctx: Record<string, string>,
  pluginRoots: string[] = []
): string {
  const path = resolveTemplatePath(workspaceRoot, templateRel, pluginRoots);
  if (!path) {
    throw new Error(`Template não encontrado: ${templateRel}`);
  }
  const raw = readFileSync(path, "utf-8");
  return Handlebars.compile(raw)(ctx);
}
