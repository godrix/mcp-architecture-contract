import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { arcValidateManifest } from "../src/tools/validateManifest.js";

const fixtures = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/hexagonal-java"
);

describe("validateManifest", () => {
  it("validates fixture manifest", () => {
    const result = arcValidateManifest({ workspaceRoot: fixtures });
    expect(result.valid).toBe(true);
    expect(result.manifestPath).toContain("arc.yaml");
  });
});
