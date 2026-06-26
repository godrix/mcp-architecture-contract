#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { runCli } from "./cli.js";
import { registerPrompts, registerResources } from "./resources/register.js";
import { registerTools } from "./tools/register.js";

async function main(): Promise<void> {
  const cliExit = await runCli(process.argv.slice(2));
  if (cliExit >= 0) {
    process.exit(cliExit);
  }

  const server = new McpServer(
    {
      name: "@godrix/architecture-contract-mcp",
      title: "Architecture Contract MCP",
      version: "1.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("@godrix/architecture-contract-mcp started (stdio)");
}

main().catch((err) => {
  console.error("@godrix/architecture-contract-mcp fatal:", err);
  process.exit(1);
});
