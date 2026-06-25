/** Directive for YAML Language Server / Red Hat YAML extension. */
export const ARC_YAML_SCHEMA_DIRECTIVE =
  "# yaml-language-server: $schema=./.arc/arc-manifest.schema.json";

export function withArcYamlSchemaDirective(yamlBody: string): string {
  const trimmed = yamlBody.replace(/^\s*# yaml-language-server:.*\n?/m, "").trimStart();
  return `${ARC_YAML_SCHEMA_DIRECTIVE}\n\n${trimmed}\n`;
}
