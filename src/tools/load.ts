import { getLoadedManifest, manifestErrorMessage } from "../context.js";

export interface ArcLoadInput {
  workspaceRoot?: string;
}

export interface KindSummary {
  id: string;
  description?: string;
  stepCount: number;
}

export interface ArcLoadOutput {
  manifestPath: string;
  profile: string;
  project: unknown;
  layerIds: string[];
  kindIds: string[];
  kindSummaries: KindSummary[];
  sliceNames: string[];
  schemaVersion: string;
  extendsRef?: string;
  pluginRoots: string[];
  warnings: string[];
}

export function arcLoad(input: ArcLoadInput): ArcLoadOutput {
  try {
    const loaded = getLoadedManifest(input.workspaceRoot);
    const { manifest, manifestPath, pluginRoots, extendsRef } = loaded;

    const warnings: string[] = [];
    if (!extendsRef && !manifest.rules?.length) {
      warnings.push("Manifesto sem extends e sem rules declaradas");
    }
    if (!(manifest.validators ?? []).length) {
      warnings.push("Nenhum validator CLI configurado");
    }

    const kindSummaries = Object.entries(manifest.kinds).map(([id, kind]) => ({
      id,
      description: kind.description,
      stepCount: kind.steps?.length ?? 0,
    }));

    return {
      manifestPath,
      profile: manifest.profile,
      project: manifest.project,
      layerIds: manifest.layers.map((l) => l.id),
      kindIds: Object.keys(manifest.kinds),
      kindSummaries,
      sliceNames: manifest.slices ? Object.keys(manifest.slices) : [],
      schemaVersion: manifest.schemaVersion,
      extendsRef,
      pluginRoots,
      warnings,
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
