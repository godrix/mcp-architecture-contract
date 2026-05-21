/** Lightweight TypeScript/JavaScript import extraction (no AST). */
export function extractTsImports(content: string): string[] {
  const imports: string[] = [];
  const patterns = [
    /import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      imports.push(m[1]);
    }
  }
  return imports;
}

export function matchesImportPattern(importPath: string, pattern: string): boolean {
  if (pattern.includes("*")) {
    const re = new RegExp(
      "^" + pattern.replace(/\//g, "[/\\\\]").replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
    );
    return re.test(importPath);
  }
  return importPath.includes(pattern) || importPath.endsWith(pattern);
}
