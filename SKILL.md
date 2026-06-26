---
name: architecture-contract-mcp
description: >-
  Use ao criar classes, endpoints ou features em projetos com arc.yaml. Antes de
  gerar código, chame arc_load e arc_resolve; confirme com o usuário; depois
  arc_scaffold com dryRun=false.
---

# Architecture Contract MCP

Este repositório expõe o servidor MCP **Architecture Contract** (`@godrix/architecture-contract-mcp`). O contrato arquitetural vive em `arc.yaml` na raiz do projeto alvo — o MCP não assume hexagonal, MVC ou FSD por padrão.

## Fluxo obrigatório antes de criar classes

1. **`arc_load`** — Carregar manifesto efetivo (`profile`, `kindIds`, `layerIds`, `pluginRoots`).
2. **`arc_resolve`** — Com `kind` e `name` (PascalCase), listar arquivos e `manualSteps` (**dryRun implícito**, não escreve). Use `includePreview: true` se útil.
3. **Confirmar com o usuário** — Mostrar paths e passos manuais; opcional **`arc_diff_scaffold`**.
4. **`arc_scaffold`** — Somente após confirmação, chamar com `dryRun: false` (e `overwrite: true` só se o usuário pedir).

## Se não existir arc.yaml

Sugerir **`arc_init`** (modo thin, default) com preset:

- Java/Spring hexagonal → `hexagonal-java@1`
- TypeScript MVC → `mvc-typescript@1`
- React FSD → `fsd-react@1`

Para arquitetura custom, usar **`arc_init_plugin`** e apontar `extends: ./.arc/plugins/{id}/manifest.yaml` no `arc.yaml`.

## Outras tools úteis

- **`arc_list_presets` / `arc_list_plugins`** — Descobrir presets e plugins locais.
- **`arc_describe_kind` / `arc_explain_layer`** — Entender kinds e layers antes de gerar código.
- **`arc_get_rules`** — Regras, docs e exemplos por layer.
- **`arc_validate`** — Regras + dependências entre layers (`mayDependOn` / `mustNotDependOn`).
- **`arc_validate_manifest`** — Validar yaml/plugins antes de operar.
- **`arc_find` / `arc_trace`** — Localizar e rastrear artefatos.
- **`arc_graph`** — Grafo Mermaid de layers.
- **`arc_register_slice`** — Registrar slice após scaffold (opt-in).

## Resources MCP

- `arc://guide` — guia completo (SKILL + README)
- `arc://manifest/effective`, `arc://rules`, `arc://plugins`
- `arc://plugin/{id}` — manifesto e templates de um plugin local

### Prompts

- `arc-scaffold-workflow` — fluxo load → resolve → confirmar → scaffold
- `arc-init-plugin` — criar e referenciar plugin local
- `arc-validate-workflow` — validar manifesto e arquitetura

## Não fazer

- Criar arquivos sem `arc_resolve` + confirmação.
- Ignorar violações de `arc_validate` em layers afetadas.
- Assumir estrutura de pastas fixa sem ler `arc.yaml`.
