import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findManifestPath,
  loadManifest,
  loadPresetFile,
} from "../src/manifest/loader.js";
import { mergeManifests } from "../src/manifest/merge.js";
import { parseExtendsRef } from "../src/manifest/pluginRef.js";

const fixtures = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/hexagonal-java"
);

const pluginFixtures = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/plugin-local"
);

describe("loader", () => {
  it("finds arc.yaml in fixture", () => {
    const path = findManifestPath(fixtures);
    expect(path).toBe(join(fixtures, "arc.yaml"));
  });

  it("loads fixture manifest", () => {
    const { manifest, workspaceRoot } = loadManifest(fixtures);
    expect(manifest.schemaVersion).toBe("1");
    expect(manifest.profile).toBe("hexagonal");
    expect(workspaceRoot).toBe(fixtures);
  });

  it("loads hexagonal-java preset", () => {
    const preset = loadPresetFile("hexagonal-java@1");
    expect(preset.profile).toBe("hexagonal");
    expect(preset.kinds.rest_endpoint).toBeDefined();
  });

  it("merges child over parent layers by id", () => {
    const parent = loadPresetFile("hexagonal-java@1");
    const child = mergeManifests(parent, {
      project: { name: "child", language: "java" },
    });
    expect(child.project.name).toBe("child");
    expect(child.layers.length).toBeGreaterThan(0);
  });

  it("loads local plugin via extends path", () => {
    const loaded = loadManifest(pluginFixtures);
    expect(loaded.extendsRef).toContain("plugins/custom/manifest.yaml");
    expect(loaded.pluginRoots.length).toBeGreaterThan(0);
    expect(loaded.manifest.kinds.rest_endpoint).toBeDefined();
    expect(loaded.manifest.project.name).toBe("plugin-local-fixture");
  });

  it("parseExtendsRef resolves preset vs file", () => {
    expect(parseExtendsRef("hexagonal-java@1", "/tmp").type).toBe("preset");
    const file = parseExtendsRef(
      "./.arc/plugins/custom/manifest.yaml",
      pluginFixtures
    );
    expect(file.type).toBe("file");
    expect(file.resolvedPath).toContain("manifest.yaml");
  });
});
