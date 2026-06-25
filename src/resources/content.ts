import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function getPackageRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "..", "..");
}

export function readPackageDoc(relativePath: string): string | null {
  const candidates = [
    join(getPackageRoot(), relativePath),
    join(getPackageRoot(), "..", relativePath),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return readFileSync(path, "utf-8");
    }
  }
  return null;
}

export function loadGuideContent(): string {
  const sections: string[] = [];
  for (const file of ["SKILL.md", "README.md"]) {
    const content = readPackageDoc(file);
    if (content) {
      sections.push(`<!-- ${file} -->\n${content.trim()}`);
    }
  }
  if (sections.length === 0) {
    return [
      "# ARC MCP Guide",
      "",
      "Documentação não encontrada no pacote. Consulte https://github.com/ ou o repositório local.",
    ].join("\n");
  }
  return sections.join("\n\n---\n\n");
}
