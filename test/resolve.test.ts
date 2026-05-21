import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPresetFile, loadManifest } from "../src/manifest/loader.js";
import { resolveKind } from "../src/core/resolveKind.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

describe("resolve", () => {
  it("resolves rest_endpoint Foo paths for hexagonal-java preset", () => {
    const manifest = loadPresetFile("hexagonal-java@1");
    const tmp = mkdtempSync(join(tmpdir(), "arc-resolve-"));
    writeFileSync(join(tmp, "arc.yaml"), "schemaVersion: '1'\n");
    mkdirSync(join(tmp, ".arc/templates"), { recursive: true });

    const { files, manualSteps } = resolveKind(
      tmp,
      manifest,
      "rest_endpoint",
      "Foo"
    );

    expect(manualSteps.length).toBeGreaterThan(0);
    const paths = files.map((f) => f.relativePath);
    expect(paths.some((p) => p.includes("FooUseCase.java"))).toBe(true);
    expect(paths.some((p) => p.includes("FooController.java"))).toBe(true);
  });

  it("resolves from fixture workspace", () => {
    const fixtures = join(
      fileURLToPath(new URL(".", import.meta.url)),
      "fixtures/hexagonal-java"
    );
    const { manifest, workspaceRoot } = loadManifest(fixtures);
    const { files } = resolveKind(
      workspaceRoot,
      manifest,
      "rest_endpoint",
      "Foo"
    );
    expect(files[0].relativePath).toContain("FooUseCase.java");
  });
});
