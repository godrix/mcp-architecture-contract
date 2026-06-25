# Goal

Build and maintain **@godrix/mcp-architecture-contract** (Architecture Contract MCP): tools for **style-agnostic** architecture discovery, scaffolding, and validation (hexagonal, MVC, FSD, etc.). Each repository's behavior is defined by an **`arc.yaml` manifest at the root** (and optionally `.arc/templates/`). The MCP must NOT hardcode hexagonal or Spring — it only interprets the project's contract.

# Stack and delivery

- Language: **TypeScript** (Node 20+)
- SDK: `@modelcontextprotocol/sdk`
- Parsing: `yaml` for arc.yaml, `glob` / `fast-glob` for paths, `handlebars` for templates
- Light validation: import/suffix regex and grep per `arc.yaml` rules
- Heavy validation: optional subprocess (`validators[].run` in arc.yaml)
- Build: `tsc` + bin `mcp-architecture-contract` at `dist/index.js`
- Tests: Vitest for path resolution, manifest loader, and scaffold dry-run
- README: Cursor install (`mcp.json`), `arc.yaml` examples (hex Java + MVC TypeScript)

# MCP server metadata

- **npm package:** `@godrix/mcp-architecture-contract`
- **binary:** `mcp-architecture-contract`
- **MCP server name:** `@godrix/mcp-architecture-contract`
- **title:** Architecture Contract MCP
- **description:** Reads `arc.yaml` from the workspace and exposes tools to map layers, trace slices, generate scaffolding from project templates, and validate declarative architectural rules. Agnostic: hexagonal, MVC, FSD, or custom profile.

# Manifest discovery

1. From `workspaceRoot` (tool argument or `process.cwd()`), walk up directories until `arc.yaml` or `.arc/config.yaml` is found.
2. If `arc.yaml` has `extends: preset-id@version`, load the built-in preset from `mcp-architecture-contract/presets/` and deep-merge (local override wins).
3. Monorepo support: child `arc.yaml` with `parent: ../../arc.yaml` (merge parent → child).
4. `schemaVersion` is required; v1 supports only `"1"`.

# MCP tools

See `README.md` for the full tool list. Core tools:

- `arc_load`, `arc_get_rules`, `arc_resolve`, `arc_find`, `arc_trace`
- `arc_scaffold`, `arc_diff_scaffold`, `arc_validate`, `arc_validate_manifest`
- `arc_init`, `arc_init_plugin`, `arc_list_presets`, `arc_list_plugins`
- `arc_describe_kind`, `arc_explain_layer`, `arc_register_slice`, `arc_graph`, `arc_suggest_location`

# Recommended agent workflow

1. `arc_load` → understand profile and kinds
2. `arc_resolve` (dry run) → list files to create
3. Confirm with the user
4. `arc_scaffold` with `dryRun: false`
5. `arc_validate` after changes
