# Objetivo

Criar um servidor MCP chamado **arc-mcp** (Architecture Contract MCP): ferramentas para descoberta, scaffolding e validação de arquitetura **agnóstica ao estilo** (hexagonal, MVC, FSD, etc.). O comportamento de cada repositório é definido por um manifesto **`arc.yaml` na raiz** (e opcionalmente `.arc/templates/`). O MCP NÃO hardcoda hexagonal nem Spring — só interpreta o contrato do projeto.

# Stack e entrega

- Linguagem: **TypeScript** (Node 20+)
- SDK: `@modelcontextprotocol/sdk`
- Parsing: `yaml` para arc.yaml, `glob` / `fast-glob` para paths, `handlebars` para templates
- Validação leve: regex/grep de imports e sufixos conforme `arc.yaml` rules
- Validação pesada: subprocess opcional (`validators[].run` no arc.yaml)
- Build: `tsc` + bin `arc-mcp` em `dist/index.js`
- Testes: Vitest para resolver de paths, loader de manifesto e scaffold dry-run
- README com instalação no Cursor (`mcp.json`), exemplos de `arc.yaml` (hex Java + MVC TypeScript)

# Nome e metadados do servidor MCP

- **name (pacote npm):** `@your-org/arc-mcp` ou `arc-mcp`
- **binary:** `arc-mcp`
- **MCP server name:** `arc`
- **title:** Architecture Contract MCP
- **description:** Lê `arc.yaml` do workspace e expõe tools para mapear camadas, rastrear slices, gerar scaffolding a partir de templates do projeto e validar regras arquiteturais declarativas. Agnóstico: hexagonal, MVC, FSD ou perfil custom.

# Descoberta do manifesto

1. A partir de `workspaceRoot` (argumento da tool ou `process.cwd()`), subir diretórios até encontrar `arc.yaml` ou `.arc/config.yaml`.
2. Se `arc.yaml` tiver `extends: preset-id@version`, carregar preset embutido em `packages/arc-mcp/presets/` e fazer deep-merge (override local ganha).
3. Suportar monorepo: `arc.yaml` filho com `parent: ../../arc.yaml` (merge parent → child).
4. `schemaVersion` obrigatório; suportar apenas `"1"` na v1.

# Tools MCP

Ver README.md para documentação completa das 9 tools: `arc_load`, `arc_get_rules`, `arc_resolve`, `arc_find`, `arc_trace`, `arc_scaffold`, `arc_validate`, `arc_init`, `arc_suggest_location`.

# Fluxo recomendado para agentes

1. `arc_load` → entender perfil e kinds
2. `arc_resolve` (dryRun) → listar arquivos a criar
3. Confirmar com usuário
4. `arc_scaffold` com `dryRun=false`
