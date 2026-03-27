import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export interface StartUiOptions {
  targetDir: string;
  port: number;
}

export async function startUi(opts: StartUiOptions): Promise<void> {
  const { targetDir, port } = opts;

  // Set environment variables
  process.env.AI_CREW_TARGET_DIR = resolve(targetDir);
  process.env.PORT = String(port);

  // Resolve the path to the standalone server
  const standaloneDir = resolve(__dirname, "../.next/standalone");
  const serverPath = resolve(standaloneDir, "packages/ui/server.js");

  console.log(`Starting AI-Crew UI...`);
  console.log(`  Target: ${targetDir}`);
  console.log(`  Port: ${port}`);
  console.log(`  URL: http://localhost:${port}`);

  // Start the Next.js standalone server
  const server = spawn("node", [serverPath], {
    env: {
      ...process.env,
      AI_CREW_TARGET_DIR: resolve(targetDir),
      PORT: String(port),
      HOSTNAME: "0.0.0.0",
    },
    stdio: "inherit",
    cwd: standaloneDir,
  });

  // Open browser after a short delay
  setTimeout(() => {
    const url = `http://localhost:${port}`;
    const platform = process.platform;
    const cmd =
      platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
    spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
  }, 2000);

  // Handle process termination
  const cleanup = () => {
    server.kill();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Wait for server to exit
  return new Promise((resolve, reject) => {
    server.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    server.on("error", reject);
  });
}
