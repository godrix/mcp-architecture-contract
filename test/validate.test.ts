import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { arcValidate } from "../src/tools/validate.js";

const fixtures = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/hexagonal-java"
);

describe("validate", () => {
  it("detects forbidden Representation import in port.in", async () => {
    const result = await arcValidate({
      workspaceRoot: fixtures,
      paths: [
        "src/main/java/com/example/fixture/port/in/BadUseCase.java",
      ],
    });

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.ruleId === "port-in-no-representation")).toBe(
      true
    );
    expect(
      result.violations.some((v) => v.file.includes("BadUseCase.java"))
    ).toBe(true);
  });
});
