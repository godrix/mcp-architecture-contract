import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { arcInit, arcInitPlugin } from "../src/tools/init.js";
import { ARC_YAML_SCHEMA_DIRECTIVE } from "../src/manifest/arcYamlHeader.js";
import { loadManifest } from "../src/manifest/loader.js";

describe("arc_init", () => {
  it("writes thin arc.yaml with extends by default", () => {
    const tmp = mkdtempSync(join(tmpdir(), "arc-init-"));
    arcInit({ workspaceRoot: tmp, preset: "hexagonal-java@1" });

    const arcYaml = readFileSync(join(tmp, "arc.yaml"), "utf-8");
    expect(arcYaml.startsWith(ARC_YAML_SCHEMA_DIRECTIVE)).toBe(true);
    expect(arcYaml).toContain("extends: hexagonal-java@1");
    expect(arcYaml).toContain("project:");

    const loaded = loadManifest(tmp);
    expect(loaded.manifest.kinds.rest_endpoint).toBeDefined();
  });

  it("copies JSON schemas into .arc/", () => {
    const tmp = mkdtempSync(join(tmpdir(), "arc-init-schema-"));
    arcInit({ workspaceRoot: tmp, preset: "hexagonal-java@1" });

    expect(existsSync(join(tmp, ".arc/arc-manifest.schema.json"))).toBe(true);
    expect(existsSync(join(tmp, ".arc/schema.json"))).toBe(true);
    expect(existsSync(join(tmp, ".arc/templates/UseCase.java.hbs"))).toBe(true);
  });

  it("full mode copies entire preset", () => {
    const tmp = mkdtempSync(join(tmpdir(), "arc-init-full-"));
    arcInit({
      workspaceRoot: tmp,
      preset: "hexagonal-java@1",
      mode: "full",
    });
    const arcYaml = readFileSync(join(tmp, "arc.yaml"), "utf-8");
    expect(arcYaml).toContain("layers:");
    expect(arcYaml).not.toContain("extends:");
  });

  it("arc_init_plugin creates plugin manifest and templates", () => {
    const tmp = mkdtempSync(join(tmpdir(), "arc-init-plugin-"));
    const result = arcInitPlugin({
      workspaceRoot: tmp,
      pluginId: "my-arch",
      preset: "hexagonal-java@1",
    });

    expect(result.created.some((p) => p.includes("manifest.yaml"))).toBe(true);
    expect(
      existsSync(join(tmp, ".arc/plugins/my-arch/templates/UseCase.java.hbs"))
    ).toBe(true);
  });
});
