import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { arcValidate } from "./validate.js";

export interface ArcGraphInput {
  workspaceRoot?: string;
}

export async function arcGraph(input: ArcGraphInput = {}) {
  try {
    const { manifest } = getLoadedManifest(input.workspaceRoot);
    const validation = await arcValidate({ workspaceRoot: input.workspaceRoot });

    const lines = ["flowchart TD"];
    for (const layer of manifest.layers) {
      const nodeId = layer.id.replace(/\./g, "_");
      const label = `${layer.id}`;
      lines.push(`  ${nodeId}["${label}"]`);
      for (const dep of layer.mayDependOn ?? []) {
        const depId = dep.replace(/\./g, "_");
        lines.push(`  ${nodeId} --> ${depId}`);
      }
    }

    for (const v of validation.violations) {
      if (v.ruleId.startsWith("layer-deps-")) {
        const [, rest] = v.ruleId.split("layer-deps-");
        const [from, to] = rest.split("->");
        if (from && to) {
          lines.push(
            `  ${from.replace(/\./g, "_")} -.->|violation| ${to.replace(/\./g, "_")}`
          );
        }
      }
    }

    return {
      mermaid: lines.join("\n"),
      violationCount: validation.violations.length,
      layers: manifest.layers.map((l) => ({
        id: l.id,
        mayDependOn: l.mayDependOn,
        mustNotDependOn: l.mustNotDependOn,
      })),
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
