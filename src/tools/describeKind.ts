import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { resolveKind } from "../core/resolveKind.js";

export interface ArcDescribeKindInput {
  workspaceRoot?: string;
  kind: string;
}

export function arcDescribeKind(input: ArcDescribeKindInput) {
  try {
    const { manifest, workspaceRoot } = getLoadedManifest(input.workspaceRoot);
    const kindDef = manifest.kinds[input.kind];
    if (!kindDef) {
      throw new Error(
        `Kind não encontrado: ${input.kind}. Disponíveis: ${Object.keys(manifest.kinds).join(", ")}`
      );
    }

    const resolved = resolveKind(workspaceRoot, manifest, input.kind, "Example");
    return {
      kind: input.kind,
      description: kindDef.description,
      variables: kindDef.variables,
      steps: kindDef.steps,
      tests: kindDef.tests,
      exampleFiles: resolved.files.map((f) => ({
        role: f.role,
        layer: f.layer,
        relativePath: f.relativePath,
        template: f.template,
      })),
      manualSteps: resolved.manualSteps,
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
