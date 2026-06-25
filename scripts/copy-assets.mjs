import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

for (const dir of ["presets", "templates", ".arc"]) {
  const src = join(root, dir);
  const dest = join(dist, dir);
  if (existsSync(src)) {
    mkdirSync(dist, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}
