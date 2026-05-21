/** Lightweight Java import extraction (no AST). */
export function extractJavaImports(content: string): string[] {
  const imports: string[] = [];
  const importRe = /^\s*import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/gm;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

export function matchesImportPattern(importPath: string, pattern: string): boolean {
  if (pattern.includes("*")) {
    const re = new RegExp(
      "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
    );
    return re.test(importPath);
  }
  return importPath.includes(pattern) || importPath.endsWith(pattern);
}
