import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadGuideContent } from "../src/resources/content.js";
import { readPluginResource } from "../src/resources/pluginResource.js";

const pluginFixtures = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/plugin-local"
);

describe("resources", () => {
  it("loadGuideContent includes SKILL and README", () => {
    const guide = loadGuideContent();
    expect(guide).toContain("Architecture Contract MCP");
    expect(guide).toContain("SKILL.md");
    expect(guide).toContain("README.md");
  });

  it("readPluginResource loads plugin manifest by id", () => {
    const data = readPluginResource("custom", pluginFixtures);
    expect(data.id).toBe("custom");
    expect(data.manifestPath).toBe(".arc/plugins/custom/manifest.yaml");
    expect(data.templates.some((t) => t.endsWith("UseCase.java.hbs"))).toBe(true);
  });
});
