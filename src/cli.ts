import { arcValidate, hasErrorViolations } from "./tools/validate.js";
import { arcScaffold } from "./tools/scaffold.js";
import { arcValidateManifest } from "./tools/validateManifest.js";

export async function runCli(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (command === "validate") {
    const workspaceRoot = parseArg(rest, "--workspace") ?? process.cwd();
    const runValidators = rest.includes("--run-validators");
    const manifest = arcValidateManifest({ workspaceRoot });
    if (!manifest.valid) {
      console.error(JSON.stringify(manifest, null, 2));
      return 1;
    }
    const result = await arcValidate({ workspaceRoot, runValidators });
    console.log(JSON.stringify(result, null, 2));
    const validatorFailed = (result.validatorResults ?? []).some(
      (v) => v.exitCode !== 0
    );
    if (hasErrorViolations(result.violations) || validatorFailed) {
      return 1;
    }
    return 0;
  }

  if (command === "scaffold") {
    const kind = parseArg(rest, "--kind");
    const name = parseArg(rest, "--name");
    const workspaceRoot = parseArg(rest, "--workspace") ?? process.cwd();
    const dryRun = !rest.includes("--write");
    if (!kind || !name) {
      console.error("Usage: architecture-contract-mcp scaffold --kind <kind> --name <Name> [--write]");
      return 1;
    }
    const result = arcScaffold({ workspaceRoot, kind, name, dryRun });
    console.log(JSON.stringify(result, null, 2));
    return result.errors.length ? 1 : 0;
  }

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(`architecture-contract-mcp — Architecture Contract MCP

Usage:
  architecture-contract-mcp                          Start MCP server (stdio)
  architecture-contract-mcp validate [--workspace] [--run-validators]
  architecture-contract-mcp scaffold --kind K --name Name [--workspace] [--write]
`);
    return 0;
  }

  return -1;
}

function parseArg(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return undefined;
}
