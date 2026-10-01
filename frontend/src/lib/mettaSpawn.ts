import { spawn } from "child_process";
import path from "path";

export function veriaRepoRoot() {
  return path.resolve(process.cwd(), "..");
}

export function runMettaProcess(args: string[], stdin?: string): Promise<string> {
  const repoRoot = veriaRepoRoot();
  const service = path.join(repoRoot, "backend", "metta", "service.py");
  const bins = [process.env.PYTHON, "python", "py", "python3"].filter(
    (bin): bin is string => Boolean(bin)
  );

  return new Promise((resolve, reject) => {
    const attempt = (index: number) => {
      if (index >= bins.length) {
        reject(new Error("No Python interpreter found. Set PYTHON to python.exe."));
        return;
      }
      const child = spawn(bins[index], [service, ...args], {
        cwd: repoRoot,
        env: { ...process.env, PYTHONPATH: repoRoot },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", () => attempt(index + 1));
      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `MeTTa service exited ${code}`));
          return;
        }
        const trimmed = stdout.trim();
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start === -1 || end === -1) {
          reject(new Error(stderr || "MeTTa service returned no JSON"));
          return;
        }
        resolve(trimmed.slice(start, end + 1));
      });
      if (stdin !== undefined) {
        try {
          child.stdin.write(stdin);
          child.stdin.end();
        } catch {
          attempt(index + 1);
        }
      }
    };
    attempt(0);
  });
}
