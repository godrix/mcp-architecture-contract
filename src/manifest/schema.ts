import { z } from "zod";

export const generateStepSchema = z.object({
  layer: z.string(),
  template: z.string(),
  namingKey: z.string().optional(),
});

export const kindStepSchema = z.union([
  z.object({ manual: z.string() }),
  z.object({ generate: generateStepSchema }),
]);

export const kindSchema = z.object({
  description: z.string().optional(),
  variables: z.record(z.string()).optional(),
  steps: z.array(kindStepSchema).optional(),
  tests: z
    .object({
      mirror: z.boolean(),
      pathReplace: z
        .array(z.object({ from: z.string(), to: z.string() }))
        .optional(),
    })
    .optional(),
});

export const layerSchema = z.object({
  id: z.string(),
  path: z.string(),
  description: z.string().optional(),
  suffix: z.string().optional(),
  mayDependOn: z.array(z.string()).optional(),
  mustNotDependOn: z.array(z.string()).optional(),
});

export const ruleWhenSchema = z.object({
  layer: z.union([z.string(), z.array(z.string())]).optional(),
});

export const ruleSchema = z.object({
  id: z.string(),
  when: ruleWhenSchema.optional(),
  forbidImports: z.array(z.string()).optional(),
  requireImplements: z.string().optional(),
  requireSuffix: z.string().optional(),
  severity: z.enum(["error", "warn"]).optional().default("error"),
  message: z.string(),
});

export const validatorSchema = z.object({
  id: z.string(),
  type: z.literal("command"),
  run: z.string(),
  optional: z.boolean().optional().default(false),
});

export const sliceArtifactSchema = z.object({
  role: z.string(),
  path: z.string().optional(),
  class: z.string().optional(),
});

export const sliceSchema = z.object({
  entry: z.string().optional(),
  artifacts: z.array(sliceArtifactSchema).optional(),
});

export const arcManifestSchema = z.object({
  schemaVersion: z.literal("1"),
  extends: z.string().optional(),
  parent: z.string().optional(),
  project: z.object({
    name: z.string(),
    language: z.enum(["java", "typescript", "kotlin", "other"]),
    rootPackage: z.string().optional(),
    sourceRoot: z.string().optional().default("."),
  }),
  profile: z.string(),
  layers: z.array(layerSchema),
  kinds: z.record(kindSchema),
  naming: z.record(z.string()),
  rules: z.array(ruleSchema).optional().default([]),
  validators: z.array(validatorSchema).optional().default([]),
  docs: z.array(z.string()).optional().default([]),
  slices: z.record(sliceSchema).optional(),
});

/** Plugin/preset manifest — project optional until merged into root arc.yaml */
export const arcPluginManifestSchema = arcManifestSchema.extend({
  project: arcManifestSchema.shape.project.optional(),
});

export type ArcManifest = z.infer<typeof arcManifestSchema>;
export type ArcPluginManifest = z.infer<typeof arcPluginManifestSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type Kind = z.infer<typeof kindSchema>;
export type KindStep = z.infer<typeof kindStepSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type GenerateStep = z.infer<typeof generateStepSchema>;
