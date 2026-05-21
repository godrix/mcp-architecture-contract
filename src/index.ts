#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/register.js";

async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: "arc",
      title: "Architecture Contract MCP",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("arc-mcp servidor iniciado (stdio)");
}

main().catch((err) => {
  console.error("arc-mcp fatal:", err);
  process.exit(1);
});
