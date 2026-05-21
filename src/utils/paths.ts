import { relative, resolve } from "node:path";

export function toRelativePath(workspaceRoot: string, absolutePath: string): string {
  return relative(resolve(workspaceRoot), resolve(absolutePath)).replace(/\\/g, "/");
}

export function sourceRoot(manifest: { project: { sourceRoot?: string } }): string {
  return manifest.project.sourceRoot ?? ".";
}
