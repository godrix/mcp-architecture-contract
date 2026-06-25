import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { arcInit, arcInitPlugin } from "../src/tools/init.js";
import { arcScaffold } from "../src/tools/scaffold.js";
import { withArcYamlSchemaDirective } from "../src/manifest/arcYamlHeader.js";

const pluginFixtures = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/plugin-local"
);

describe("scaffold", () => {
  it("dryRun lists files without writing", () => {
    const tmp = mkdtempSync(join(tmpdir(), "arc-scaffold-"));
    arcInit({ workspaceRoot: tmp, preset: "hexagonal-java@1" });

    const result = arcScaffold({
      workspaceRoot: tmp,
      kind: "rest_endpoint",
      name: "Foo",
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.created.length).toBeGreaterThan(0);
    const useCasePath = join(
      tmp,
      "src/main/java/com/example/myapp/port/in/FooUseCase.java"
    );
    expect(existsSync(useCasePath)).toBe(false);
  });

  it("writes files when dryRun is false", () => {
    const tmp = mkdtempSync(join(tmpdir(), "arc-scaffold-write-"));
    arcInit({ workspaceRoot: tmp, preset: "hexagonal-java@1" });

    const result = arcScaffold({
      workspaceRoot: tmp,
      kind: "rest_endpoint",
      name: "Bar",
      dryRun: false,
    });

    expect(result.created.length).toBeGreaterThan(0);
    expect(
      existsSync(
        join(tmp, "src/main/java/com/example/myapp/port/in/BarUseCase.java")
      )
    ).toBe(true);
  });

  it("resolves templates from local plugin fixture", () => {
    const result = arcScaffold({
      workspaceRoot: pluginFixtures,
      kind: "rest_endpoint",
      name: "PluginCase",
      dryRun: true,
    });
    expect(result.created.some((p) => p.includes("PluginCaseUseCase.java"))).toBe(
      true
    );
  });

  it("scaffold via plugin-init workflow", () => {
    const tmp = mkdtempSync(join(tmpdir(), "arc-plugin-scaffold-"));
    arcInitPlugin({
      workspaceRoot: tmp,
      pluginId: "custom",
      preset: "hexagonal-java@1",
    });

    const arcYaml = withArcYamlSchemaDirective(`schemaVersion: "1"
extends: ./.arc/plugins/custom/manifest.yaml
project:
  name: test
  language: java
  rootPackage: com.example.test
`);
    writeFileSync(join(tmp, "arc.yaml"), arcYaml, "utf-8");

    const result = arcScaffold({
      workspaceRoot: tmp,
      kind: "rest_endpoint",
      name: "Qux",
      dryRun: true,
    });
    expect(result.created.length).toBeGreaterThan(0);
  });
});
