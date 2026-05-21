import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findManifestPath,
  loadManifest,
  loadPresetFile,
} from "../src/manifest/loader.js";
import { mergeManifests } from "../src/manifest/merge.js";

const fixtures = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/hexagonal-java"
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
});
