import { getLoadedManifest, manifestErrorMessage } from "../context.js";
import { listPresetIds, loadPresetFile } from "../manifest/loader.js";

export function arcListPresets() {
  return {
    presets: listPresetIds().map((ref) => {
      try {
        const preset = loadPresetFile(ref);
        return {
          ref,
          profile: preset.profile,
          kindIds: Object.keys(preset.kinds),
          layerIds: preset.layers.map((l) => l.id),
        };
      } catch {
        return { ref, error: "failed to load" };
      }
    }),
  };
}
