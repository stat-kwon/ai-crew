import path from "node:path";

export function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export function safePath(targetDir: string, relativePath: string): string {
  const resolved = path.resolve(targetDir, relativePath);
  const normalizedTarget = path.resolve(targetDir);
  if (!resolved.startsWith(normalizedTarget)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}
