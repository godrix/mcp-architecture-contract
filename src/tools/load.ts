import { getLoadedManifest, manifestErrorMessage } from "../context.js";

export interface ArcLoadInput {
  workspaceRoot?: string;
}

export interface ArcLoadOutput {
  manifestPath: string;
  profile: string;
  project: unknown;
  layerIds: string[];
  kindIds: string[];
  sliceNames: string[];
  schemaVersion: string;
}

export function arcLoad(input: ArcLoadInput): ArcLoadOutput {
  try {
    const { manifest, manifestPath } = getLoadedManifest(input.workspaceRoot);
    return {
      manifestPath,
      profile: manifest.profile,
      project: manifest.project,
      layerIds: manifest.layers.map((l) => l.id),
      kindIds: Object.keys(manifest.kinds),
      sliceNames: manifest.slices ? Object.keys(manifest.slices) : [],
      schemaVersion: manifest.schemaVersion,
    };
  } catch (err) {
    throw new Error(manifestErrorMessage(err));
  }
}
