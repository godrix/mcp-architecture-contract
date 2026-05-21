---
name: arc-mcp
description: >-
  Use ao criar classes, endpoints ou features em projetos com arc.yaml. Antes de
  gerar código, chame arc_load e arc_resolve; confirme com o usuário; depois
  arc_scaffold com dryRun=false.
---

# Architecture Contract MCP

Este repositório expõe o servidor MCP **arc**. O contrato arquitetural vive em `arc.yaml` na raiz do projeto alvo — o MCP não assume hexagonal, MVC ou FSD por padrão.

## Fluxo obrigatório antes de criar classes

1. **`arc_load`** — Carregar manifesto efetivo (`profile`, `kindIds`, `layerIds`).
2. **`arc_resolve`** — Com `kind` e `name` (PascalCase), listar arquivos e `manualSteps` (**dryRun implícito**, não escreve).
3. **Confirmar com o usuário** — Mostrar paths e passos manuais; ajustar `name`/`kind` se necessário.
4. **`arc_scaffold`** — Somente após confirmação, chamar com `dryRun: false` (e `overwrite: true` só se o usuário pedir).

## Se não existir arc.yaml

Sugerir **`arc_init`** com preset adequado:

- Java/Spring hexagonal → `hexagonal-java@1`
- TypeScript MVC → `mvc-typescript@1`
- React FSD → `fsd-react@1`

## Outras tools úteis

- **`arc_get_rules`** — Regras e docs antes de refatorar.
- **`arc_validate`** — Após mudanças; `runValidators: true` só quando o yaml define validators.
- **`arc_find` / `arc_trace`** — Localizar artefatos existentes.
- **`arc_suggest_location`** — Path esperado para um `role`.

## Não fazer

- Criar arquivos sem `arc_resolve` + confirmação.
- Ignorar violações de `arc_validate` em layers afetadas.
- Assumir estrutura de pastas fixa sem ler `arc.yaml`.
