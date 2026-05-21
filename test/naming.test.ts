import { describe, expect, it } from "vitest";
import {
  applyNamingTemplate,
  buildNamingContext,
  toCamelCase,
} from "../src/utils/naming.js";
import { loadPresetFile } from "../src/manifest/loader.js";
import { getLayerById } from "../src/utils/layers.js";

describe("naming", () => {
  it("converts PascalCase to camelCase", () => {
    expect(toCamelCase("Foo")).toBe("foo");
    expect(toCamelCase("FooBar")).toBe("fooBar");
  });

  it("applies naming template for use case", () => {
    const manifest = loadPresetFile("hexagonal-java@1");
    const layer = getLayerById(manifest, "port.in")!;
    const ctx = buildNamingContext(manifest, "Foo", layer);
    const path = applyNamingTemplate(manifest.naming.useCase, ctx);
    expect(path).toBe(
      "src/main/java/com/example/myapp/port/in/FooUseCase.java"
    );
  });
});
