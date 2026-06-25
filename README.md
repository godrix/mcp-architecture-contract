# @godrix/mcp-architecture-contract

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en-US/install-mcp?name=architecture-contract&config=eyJjb21tYW5kIjoibnB4IC15IEBnb2RyaXgvbWNwLWFyY2hpdGVjdHVyZS1jb250cmFjdCJ9)

**Architecture Contract MCP (ARC)** — agnostic MCP server that reads `arc.yaml` from the workspace and exposes tools to map layers, trace slices, generate scaffolding, and validate architectural rules.

- **MCP server name:** `@godrix/mcp-architecture-contract`
- **Binary:** `mcp-architecture-contract`
- **Tool prefix:** `arc_*` (unchanged)
- **Node:** 20+

## Quick install (npx)

No clone or local build required — the published npm package includes compiled JavaScript.

### Cursor / Claude Desktop (`mcp.json`)

```json
{
  "mcpServers": {
    "architecture-contract": {
      "command": "npx",
      "args": ["-y", "@godrix/mcp-architecture-contract"],
      "env": {}
    }
  }
}
```

Restart your MCP client after saving. Or use the **Install MCP Server** button above.

### Global install (alternative)

```bash
npm install -g @godrix/mcp-architecture-contract
```

Then use `"command": "mcp-architecture-contract"` in `mcp.json`.

## Local development

```bash
git clone https://github.com/godrix/mcp-architecture-contract.git
cd mcp-architecture-contract
npm install
npm run build
```

```json
{
  "mcpServers": {
    "architecture-contract": {
      "command": "node",
      "args": ["/absolute/path/mcp-architecture-contract/dist/index.js"],
      "env": {}
    }
  }
}
```

## CLI (CI/local)

```bash
# Validate manifest + rules (+ validators if configured)
node dist/index.js validate --workspace /path/to/project
node dist/index.js validate --workspace /path/to/project --run-validators

# Scaffold dry-run (default) or write
node dist/index.js scaffold --kind rest_endpoint --name Foo --workspace /path/to/project
node dist/index.js scaffold --kind rest_endpoint --name Foo --workspace /path/to/project --write
```

Or via bin:

```bash
mcp-architecture-contract validate --workspace /path/to/project
mcp-architecture-contract scaffold --kind rest_endpoint --name Foo --write
```

Exit code `1` when there are `error` violations or a validator fails.

## Local plugins

Custom architectures live under `.arc/plugins/{id}/`:

```text
my-project/
  arc.yaml
  .arc/plugins/my-arch/
    manifest.yaml
    templates/
      UseCase.java.hbs
```

```yaml
# arc.yaml (thin — default from arc_init)
schemaVersion: "1"
extends: ./.arc/plugins/my-arch/manifest.yaml

project:
  name: my-service
  language: java
  rootPackage: com.example.myapp
```

`extends` accepts:

- Built-in preset: `hexagonal-java@1`
- Local file: `./.arc/plugins/my-arch/manifest.yaml`

Template priority: `.arc/templates/` (project) → `plugin/templates/` → built-in preset.

Create an editable plugin from a preset:

```json
{
  "tool": "arc_init_plugin",
  "arguments": {
    "pluginId": "my-arch",
    "preset": "hexagonal-java@1",
    "workspaceRoot": "/path/to/project"
  }
}
```

## MCP tools

| Tool | Description |
|------|-------------|
| `arc_load` | Effective manifest + extendsRef, pluginRoots, kindSummaries |
| `arc_get_rules` | Rules, layers, docs and examples per layer |
| `arc_resolve` | Files to create (`includePreview` optional) |
| `arc_find` | Search with score; `role`/`suffix` filters |
| `arc_trace` | Slice or inferred chain (find + imports) |
| `arc_scaffold` | Generate Handlebars files (`dryRun` default `true`) |
| `arc_diff_scaffold` | Expected diff vs disk |
| `arc_validate` | Rules + **mayDependOn/mustNotDependOn** + CLI validators |
| `arc_validate_manifest` | Validate arc.yaml and plugins against schema |
| `arc_init` | Create **thin** arc.yaml (default) or `mode: full` |
| `arc_init_plugin` | Create `.arc/plugins/{id}/` from preset |
| `arc_list_presets` | List built-in presets |
| `arc_list_plugins` | List local plugins |
| `arc_describe_kind` | Steps/templates for a kind |
| `arc_explain_layer` | Layer + rules + repo examples |
| `arc_register_slice` | Register slice in arc.yaml |
| `arc_graph` | Mermaid graph of layers + violations |
| `arc_suggest_location` | Expected path for `role` + `name` |

### MCP resources

- `arc://guide` — full guide (SKILL + README)
- `arc://manifest/effective` — merged manifest (JSON)
- `arc://rules` — layers + rules
- `arc://plugins` — plugins in `.arc/plugins/`
- `arc://plugin/{id}` — manifest and templates for a plugin

### Prompts

- `arc-scaffold-workflow` — load → resolve → confirm → scaffold
- `arc-init-plugin` — create plugin in `.arc/plugins/{id}/`
- `arc-validate-workflow` — validate manifest and compliance

### Recommended workflow

1. `arc_init` or `arc_init_plugin` + local `extends`
2. `arc_load` → profile, kinds, pluginRoots
3. `arc_resolve` (or `arc_diff_scaffold`) with `kind` + `name`
4. Confirm with the user
5. `arc_scaffold` with `dryRun: false`
6. `arc_validate` after changes

## Built-in presets

- `hexagonal-java@1` — Spring hexagonal (port.in/out, adapters, domain)
- `mvc-typescript@1` — controllers, services, api
- `fsd-react@1` — Feature-Sliced Design (app, pages, widgets, features, entities, shared)

## `arc.yaml` schema (v1)

`arc_init` writes to the project:

- `.arc/arc-manifest.schema.json` — manifest JSON Schema
- `.arc/schema.json` — alias (`$ref`) for lint tools
- thin `arc.yaml` with `extends` (or full with `mode: full`)

```yaml
# yaml-language-server: $schema=./.arc/arc-manifest.schema.json

schemaVersion: "1"
parent: optional/path/to/parent/arc.yaml
extends: preset-id@version | ./.arc/plugins/id/manifest.yaml

project:
  name: string
  language: java | typescript | kotlin | other
  rootPackage: optional
  sourceRoot: "."

profile: hexagonal | mvc | fsd | custom

layers:
  - id: string
    path: glob
    suffix: optional
    mayDependOn: [layerIds]
    mustNotDependOn: [layerIds]

kinds:
  <kindId>:
    variables: { key: description }
    steps:
      - manual: string
      - generate: { layer, template, namingKey? }

rules:
  - id: string
    when: { layer: string | string[] }
    forbidImports: [glob/substring]
    requireSuffix: string
    severity: error | warn
    message: string
```

## Tests

```bash
npm test
```

## MCP Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

## Migration from `arc-mcp`

| Before | After |
|--------|-------|
| npm package `arc-mcp` | `@godrix/mcp-architecture-contract` |
| Folder `arc-mcp` | `mcp-architecture-contract` |
| bin `arc-mcp` | `mcp-architecture-contract` |
| MCP server name `arc` | `@godrix/mcp-architecture-contract` |
| Tool names `arc_*` | unchanged |

## License

MIT
