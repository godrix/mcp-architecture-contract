import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, cpSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { arcInit } from "../src/tools/init.js";
import { arcScaffold } from "../src/tools/scaffold.js";

const packageRoot = join(
  fileURLToPath(new URL(".", import.meta.url)),
  ".."
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
});
