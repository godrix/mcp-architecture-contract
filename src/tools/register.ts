import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { arcLoad } from "./load.js";
import { arcGetRules } from "./getRules.js";
import { arcResolve } from "./resolve.js";
import { arcFind } from "./find.js";
import { arcTrace } from "./trace.js";
import { arcScaffold } from "./scaffold.js";
import { arcValidate } from "./validate.js";
import { arcInit, arcInitPlugin } from "./init.js";
import { arcSuggestLocation } from "./suggest.js";
import { arcValidateManifest } from "./validateManifest.js";
import { arcListPresets } from "./listPresets.js";
import { arcListPlugins } from "./listPlugins.js";
import { arcDescribeKind } from "./describeKind.js";
import { arcExplainLayer } from "./explainLayer.js";
import { arcDiffScaffold } from "./diffScaffold.js";
import { arcRegisterSlice } from "./registerSlice.js";
import { arcGraph } from "./graph.js";

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
        "Retorna regras, documentação resolvida, exemplos por layer e resumo de layers.",
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
      description:
        "Dado kind e name, resolve lista de arquivos a criar (sem escrever). includePreview opcional.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        kind: z.string(),
        name: z.string(),
        includePreview: z.boolean().optional(),
      },
    },
    async (args) => textResult(arcResolve(args))
  );

  server.registerTool(
    "arc_find",
    {
      title: "Find artifacts",
      description:
        "Busca artefatos por nome ou sufixo nas layers declaradas (com score).",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        query: z.string(),
        layerId: z.string().optional(),
        role: z.string().optional(),
        suffix: z.string().optional(),
        limit: z.number().optional(),
      },
    },
    async (args) => textResult(await arcFind(args))
  );

  server.registerTool(
    "arc_trace",
    {
      title: "Trace slice",
      description:
        "Rastreia um slice ou entrada (openapi, use case, controller) com cadeia inferida.",
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
      description:
        "Valida regras leves, dependências entre layers e opcionalmente validators CLI.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        paths: z.array(z.string()).optional(),
        runValidators: z.boolean().optional(),
      },
    },
    async (args) => textResult(await arcValidate(args))
  );

  server.registerTool(
    "arc_validate_manifest",
    {
      title: "Validate arc.yaml manifest",
      description:
        "Valida arc.yaml, extends/plugins referenciados contra schema Zod.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
      },
    },
    async (args) => textResult(arcValidateManifest(args))
  );

  server.registerTool(
    "arc_init",
    {
      title: "Initialize arc.yaml",
      description:
        "Cria arc.yaml thin (extends preset) ou full, schemas e templates.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        preset: z.string(),
        force: z.boolean().optional(),
        mode: z.enum(["thin", "full"]).optional(),
        projectName: z.string().optional(),
        rootPackage: z.string().optional(),
      },
    },
    async (args) => textResult(arcInit(args))
  );

  server.registerTool(
    "arc_init_plugin",
    {
      title: "Initialize local ARC plugin",
      description:
        "Cria .arc/plugins/{id}/manifest.yaml e templates a partir de preset.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        pluginId: z.string(),
        preset: z.string(),
        force: z.boolean().optional(),
      },
    },
    async (args) => textResult(arcInitPlugin(args))
  );

  server.registerTool(
    "arc_list_presets",
    {
      title: "List built-in presets",
      description: "Lista presets embutidos com profile e kinds.",
      inputSchema: {},
    },
    async () => textResult(arcListPresets())
  );

  server.registerTool(
    "arc_list_plugins",
    {
      title: "List local plugins",
      description: "Varre .arc/plugins/**/manifest.yaml no workspace.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
      },
    },
    async (args) => textResult(arcListPlugins(args))
  );

  server.registerTool(
    "arc_describe_kind",
    {
      title: "Describe architecture kind",
      description: "Detalha steps, templates e naming de um kind.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        kind: z.string(),
      },
    },
    async (args) => textResult(arcDescribeKind(args))
  );

  server.registerTool(
    "arc_explain_layer",
    {
      title: "Explain architecture layer",
      description: "Layer, rules aplicáveis e arquivos exemplo do repo.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        layerId: z.string(),
        exampleLimit: z.number().optional(),
      },
    },
    async (args) => textResult(await arcExplainLayer(args))
  );

  server.registerTool(
    "arc_diff_scaffold",
    {
      title: "Diff scaffold preview",
      description: "Diff previsto vs disco antes de arc_scaffold dryRun=false.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        kind: z.string(),
        name: z.string(),
      },
    },
    async (args) => textResult(arcDiffScaffold(args))
  );

  server.registerTool(
    "arc_register_slice",
    {
      title: "Register slice in arc.yaml",
      description: "Atualiza slices no arc.yaml após scaffold.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
        slice: z.string(),
        kind: z.string(),
        name: z.string(),
        entry: z.string().optional(),
      },
    },
    async (args) => textResult(arcRegisterSlice(args))
  );

  server.registerTool(
    "arc_graph",
    {
      title: "Architecture dependency graph",
      description: "Export Mermaid de layers e violações atuais.",
      inputSchema: {
        workspaceRoot: z.string().optional(),
      },
    },
    async (args) => textResult(await arcGraph(args))
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
