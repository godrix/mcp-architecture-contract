import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getLoadedManifest } from "../context.js";
import { arcListPlugins } from "../tools/listPlugins.js";
import { loadGuideContent } from "./content.js";
import { readPluginResource } from "./pluginResource.js";

export function registerResources(server: McpServer): void {
  server.registerResource(
    "guide",
    "arc://guide",
    {
      title: "ARC MCP Guide",
      description:
        "Guia de uso: SKILL + README (fluxos, tools, plugins, CLI)",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: loadGuideContent(),
        },
      ],
    })
  );

  server.registerResource(
    "manifest-effective",
    "arc://manifest/effective",
    {
      title: "Effective ARC manifest",
      description: "Manifesto mergeado (extends/parent) do workspace",
      mimeType: "application/json",
    },
    async (uri) => {
      const loaded = getLoadedManifest();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                manifestPath: loaded.manifestPath,
                extendsRef: loaded.extendsRef,
                pluginRoots: loaded.pluginRoots,
                manifest: loaded.manifest,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerResource(
    "rules",
    "arc://rules",
    {
      title: "ARC rules and layers",
      description: "Layers e rules do manifesto efetivo",
      mimeType: "application/json",
    },
    async (uri) => {
      const { manifest } = getLoadedManifest();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              { layers: manifest.layers, rules: manifest.rules ?? [] },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerResource(
    "plugins",
    "arc://plugins",
    {
      title: "Local ARC plugins",
      description: "Lista plugins em .arc/plugins/",
      mimeType: "application/json",
    },
    async (uri) => {
      const result = arcListPlugins();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "plugin",
    new ResourceTemplate("arc://plugin/{id}", {
      list: async () => {
        const { plugins } = arcListPlugins();
        return {
          resources: plugins.map((p) => ({
            uri: `arc://plugin/${p.id}`,
            name: p.id,
            description: p.profile
              ? `Plugin ${p.id} (${p.profile})`
              : `Plugin ${p.id}`,
            mimeType: "application/json",
          })),
        };
      },
      complete: {
        id: async () => arcListPlugins().plugins.map((p) => p.id),
      },
    }),
    {
      title: "ARC plugin manifest",
      description: "Manifesto e templates de um plugin local (.arc/plugins/{id}/)",
      mimeType: "application/json",
    },
    async (uri, { id }) => {
      const data = readPluginResource(String(id));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "arc-scaffold-workflow",
    {
      title: "ARC scaffold workflow",
      description:
        "Fluxo obrigatório: arc_load → arc_resolve → confirmar → arc_scaffold (dryRun=false)",
    },
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "Antes de criar arquivos em um projeto com arc.yaml:",
              "1. arc_load — entender profile, kinds e pluginRoots",
              "2. arc_resolve — listar arquivos e manualSteps (não escreve)",
              "3. Confirmar paths com o usuário; opcional arc_diff_scaffold",
              "4. arc_scaffold com dryRun=false somente após confirmação",
              "",
              "Se não existir arc.yaml: arc_init (thin) ou arc_init_plugin.",
              "Após mudanças: arc_validate.",
              "",
              "Leia arc://guide para documentação completa.",
            ].join("\n"),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "arc-init-plugin",
    {
      title: "Initialize local ARC plugin",
      description:
        "Guia para criar e referenciar plugin em .arc/plugins/{id}/",
      argsSchema: {
        pluginId: z.string().optional(),
        preset: z.string().optional(),
      },
    },
    async ({ pluginId, preset }) => {
      const id = pluginId ?? "minha-arq";
      const presetRef = preset ?? "hexagonal-java@1";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Criar arquitetura custom como plugin local (id: ${id}, preset: ${presetRef}):`,
                "",
                "1. arc_init_plugin — criar .arc/plugins/{id}/manifest.yaml + templates/",
                `   { "pluginId": "${id}", "preset": "${presetRef}" }`,
                "2. Editar manifest.yaml do plugin (layers, kinds, rules, naming)",
                "3. arc_init ou arc.yaml thin com:",
                `   extends: ./.arc/plugins/${id}/manifest.yaml`,
                "4. arc_validate_manifest — validar yaml e plugins",
                "5. arc_load → arc_describe_kind / arc_explain_layer antes de scaffold",
                "",
                "Resources: arc://plugin/{id} para ler manifesto; arc://guide para docs.",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "arc-validate-workflow",
    {
      title: "ARC validate workflow",
      description: "Validar manifesto e conformidade arquitetural após mudanças",
      argsSchema: {
        runValidators: z.string().optional(),
      },
    },
    async ({ runValidators }) => {
      const runCli = runValidators === "true";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Validar projeto com arc.yaml:",
                "",
                "1. arc_validate_manifest — schema do arc.yaml e plugins em .arc/plugins/",
                "2. arc_validate — regras declaradas + mayDependOn/mustNotDependOn entre layers",
                runCli
                  ? "3. arc_validate com runValidators: true — executar validators CLI do yaml"
                  : "3. Opcional: arc_validate com runValidators: true se houver validators[] no yaml",
                "4. arc_graph — visualizar layers e violações (Mermaid)",
                "5. Corrigir violações com severity error antes de merge/PR",
                "",
                "CLI: node dist/index.js validate --workspace <path>",
                runCli ? "     node dist/index.js validate --run-validators --workspace <path>" : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          },
        ],
      };
    }
  );
}
