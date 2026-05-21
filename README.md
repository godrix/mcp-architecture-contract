# arc-mcp

**Architecture Contract MCP** — servidor MCP agnóstico que lê `arc.yaml` do workspace e expõe ferramentas para mapear camadas, rastrear slices, gerar scaffolding e validar regras arquiteturais.

- **MCP server name:** `arc`
- **Binary:** `arc-mcp`
- **Node:** 20+

## Instalação

```bash
npm install
npm run build
```

## Cursor (`mcp.json`)

```json
{
  "mcpServers": {
    "arc": {
      "command": "node",
      "args": ["/absolute/path/arc-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## Tools MCP

| Tool | Descrição |
|------|-----------|
| `arc_load` | Carrega manifesto efetivo (extends/parent merge) |
| `arc_get_rules` | Regras, layers e docs (snippets até 8kb) |
| `arc_resolve` | Lista arquivos a criar para um `kind` + `name` (sem escrever) |
| `arc_find` | Busca artefatos por nome/sufixo nas layers |
| `arc_trace` | Rastreia slice ou entrada (openapi, class name) |
| `arc_scaffold` | Gera arquivos via Handlebars (`dryRun` padrão `true`) |
| `arc_validate` | Regras leves + validators CLI opcionais |
| `arc_init` | Cria `arc.yaml` e `.arc/templates/` a partir de preset |
| `arc_suggest_location` | Path esperado para `role` + `name` |

### Fluxo recomendado

1. `arc_init` com preset (`hexagonal-java@1`, `mvc-typescript@1`, `fsd-react@1`)
2. `arc_load` → entender perfil e kinds
3. `arc_resolve` com `kind` + `name` (PascalCase)
4. Confirmar com o usuário
5. `arc_scaffold` com `dryRun: false`

## Presets embutidos

- `hexagonal-java@1` — Spring hexagonal (port.in/out, adapters, domain)
- `mvc-typescript@1` — controllers, services, api
- `fsd-react@1` — Feature-Sliced Design (app, pages, widgets, features, entities, shared)

## Schema `arc.yaml` (v1)

```yaml
schemaVersion: "1"
parent: optional/path/to/parent/arc.yaml
extends: preset-id@version   # merge preset embutido; local ganha

project:
  name: string
  language: java | typescript | kotlin | other
  rootPackage: optional
  sourceRoot: "."            # default

profile: hexagonal | mvc | fsd | custom

layers:
  - id: string
    path: glob
    suffix: optional
    mayDependOn: [layerIds]
    mustNotDependOn: [layerIds]

kinds:
  <kindId>:
    steps:
      - manual: string
      - generate: { layer, template, namingKey? }
    tests: { mirror: bool, pathReplace: [{ from, to }] }

naming:
  <role>: "path/with/{Name}/{name}/{package}/{layer}"

rules:
  - id: string
    when: { layer: string | string[] }
    forbidImports: [glob/substring]
    requireSuffix: string
    requireImplements: glob
    message: string

validators:
  - id: string
    type: command
    run: shell command
    optional: false

docs: [globs]
slices: { sliceName: { entry, artifacts: [{ role, path, class }] } }
```

## Testes

```bash
npm test
```

## Inspector MCP

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

## Exemplo `arc_init`

No inspector ou Cursor, chame `arc_init` com:

```json
{ "preset": "hexagonal-java@1", "workspaceRoot": "/path/to/your/project" }
```

Isso cria `arc.yaml` e copia templates para `.arc/templates/`.
