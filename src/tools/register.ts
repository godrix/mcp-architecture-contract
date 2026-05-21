import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { arcLoad } from "./load.js";
import { arcGetRules } from "./getRules.js";
import { arcResolve } from "./resolve.js";
import { arcFind } from "./find.js";
import { arcTrace } from "./trace.js";
import { arcScaffold } from "./scaffold.js";
import { arcValidate } from "./validate.js";
import { arcInit } from "./init.js";
import { arcSuggestLocation } from "./suggest.js";

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "arc_load",
    {
      title: "Load arc manifest",
      description:
        "Carrega e devolve o manifesto efetivo (após extends/parent merge) e metadados do projeto.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
      },
    },
    async (args) => textResult(arcLoad(args))
  );

  server.registerTool(
    "arc_get_rules",
    {
      title: "Get architecture rules",
      description:
        "Retorna regras, documentação resolvida e resumo de layers.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        layerId: z.string().optional(),
      },
    },
    async (args) => textResult(await arcGetRules(args))
  );

  server.registerTool(
    "arc_resolve",
    {
      title: "Resolve scaffold files",
      description: "Dado kind e name, resolve lista de arquivos a criar (sem escrever).",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        kind: z.string(),
        name: z.string(),
      },
    },
    async (args) => textResult(arcResolve(args))
  );

  server.registerTool(
    "arc_find",
    {
      title: "Find artifacts",
      description: "Busca artefatos por nome ou sufixo nas layers declaradas.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        query: z.string(),
        layerId: z.string().optional(),
        limit: z.number().optional(),
      },
    },
    async (args) => textResult(await arcFind(args))
  );

  server.registerTool(
    "arc_trace",
    {
      title: "Trace slice",
      description: "Rastreia um slice ou entrada (openapi, use case, controller).",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        slice: z.string().optional(),
        entry: z.string().optional(),
        className: z.string().optional(),
      },
    },
    async (args) => textResult(await arcTrace(args))
  );

  server.registerTool(
    "arc_scaffold",
    {
      title: "Scaffold files",
      description:
        "Gera arquivos a partir de templates Handlebars. dryRun=true só lista (padrão).",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        kind: z.string(),
        name: z.string(),
        dryRun: z.boolean().optional(),
        overwrite: z.boolean().optional(),
      },
    },
    async (args) => textResult(arcScaffold(args))
  );

  server.registerTool(
    "arc_validate",
    {
      title: "Validate architecture",
      description: "Valida regras leves do arc.yaml e opcionalmente validators CLI.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        paths: z.array(z.string()).optional(),
        runValidators: z.boolean().optional(),
      },
    },
    async (args) => textResult(await arcValidate(args))
  );

  server.registerTool(
    "arc_init",
    {
      title: "Initialize arc.yaml",
      description:
        "Cria arc.yaml inicial e pasta .arc/templates a partir de preset (só se não existir).",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        preset: z.string(),
        force: z.boolean().optional(),
      },
    },
    async (args) => textResult(arcInit(args))
  );

  server.registerTool(
    "arc_suggest_location",
    {
      title: "Suggest file location",
      description: "Dado role ou suffix, devolve path esperado pelo naming.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        role: z.string(),
        name: z.string(),
      },
    },
    async (args) => textResult(arcSuggestLocation(args))
  );
}
