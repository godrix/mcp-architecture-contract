import { spawn } from "node:child_process";

export interface SubprocessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const VALIDATOR_TIMEOUT_MS = 120_000;

export function runCommand(
  command: string,
  cwd: string,
  timeoutMs = VALIDATOR_TIMEOUT_MS
): Promise<SubprocessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      cwd,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Validator timeout após ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}
