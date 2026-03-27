import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, cp, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import type { ExternalWorkflow } from "./types.js";

const CACHE_ROOT = join(homedir(), ".ai-crew", "cache");

/**
 * Fetch workflow files and return the local path to the resolved content.
 * Returns null if workflow is "none" or null.
 */
export async function fetchWorkflow(
  workflow: ExternalWorkflow | string | null,
  catalogDir: string,
): Promise<string | null> {
  if (workflow === null || workflow === "none") {
    return null;
  }

  if (typeof workflow === "string") {
    // Local workflow in catalog/workflows/{name}/
    return resolveLocal(workflow, catalogDir);
  }

  // External workflow object
  const { source } = workflow;

  if (source.startsWith("github:")) {
    return fetchFromGithub(workflow);
  }

  if (source.startsWith("npm:")) {
    return fetchFromNpm(workflow);
  }

  throw new Error(`Unknown workflow source type: ${source}`);
}

/**
 * Resolve a local workflow from catalog/workflows/{name}/
 */
export function resolveLocal(name: string, catalogDir: string): string {
  const workflowPath = join(catalogDir, "workflows", name);
  if (!existsSync(workflowPath)) {
    throw new Error(
      `Local workflow not found: ${name} (looked at ${workflowPath})`,
    );
  }
  return workflowPath;
}

/**
 * Fetch from GitHub: git clone --depth 1
 * Source format: "github:owner/repo"
 */
export async function fetchFromGithub(
  workflow: ExternalWorkflow,
): Promise<string> {
  const repoPath = workflow.source.replace("github:", "");
  const ref = workflow.ref ?? "main";
  const cacheKey = getCacheKey(`github:${repoPath}@${ref}`);
  const cachePath = join(CACHE_ROOT, cacheKey);

  // Return cached if exists
  if (existsSync(cachePath)) {
    return workflow.path ? join(cachePath, workflow.path) : cachePath;
  }

  await mkdir(CACHE_ROOT, { recursive: true });

  const repoUrl = `https://github.com/${repoPath}.git`;
  const tmpPath = `${cachePath}.tmp`;

  try {
    // Clean up any previous failed attempt
    if (existsSync(tmpPath)) {
      await rm(tmpPath, { recursive: true, force: true });
    }

    execSync(
      `git clone --depth 1 --branch ${ref} ${repoUrl} ${tmpPath}`,
      { stdio: "pipe" },
    );

    // Remove .git directory to save space
    const gitDir = join(tmpPath, ".git");
    if (existsSync(gitDir)) {
      await rm(gitDir, { recursive: true, force: true });
    }

    // Move to final cache location
    await cp(tmpPath, cachePath, { recursive: true });
    await rm(tmpPath, { recursive: true, force: true });
  } catch (err) {
    // Clean up on failure
    if (existsSync(tmpPath)) {
      await rm(tmpPath, { recursive: true, force: true });
    }
    throw new Error(
      `Failed to fetch workflow from ${repoUrl}: ${(err as Error).message}`,
    );
  }

  return workflow.path ? join(cachePath, workflow.path) : cachePath;
}

/**
 * Fetch from npm: npm pack & extract
 * Source format: "npm:package-name" or "npm:@scope/package-name"
 */
export async function fetchFromNpm(
  workflow: ExternalWorkflow,
): Promise<string> {
  const pkgName = workflow.source.replace("npm:", "");
  const cacheKey = getCacheKey(`npm:${pkgName}`);
  const cachePath = join(CACHE_ROOT, cacheKey);

  // Return cached if exists
  if (existsSync(cachePath)) {
    return workflow.path ? join(cachePath, workflow.path) : cachePath;
  }

  await mkdir(cachePath, { recursive: true });

  try {
    // npm pack downloads to cwd as .tgz
    execSync(`npm pack ${pkgName} --pack-destination ${cachePath}`, {
      stdio: "pipe",
      cwd: cachePath,
    });

    // Find the .tgz file
    const files = await readdir(cachePath);
    const tgz = files.find((f) => f.endsWith(".tgz"));
    if (!tgz) {
      throw new Error(`No .tgz file found after npm pack ${pkgName}`);
    }

    // Extract
    execSync(`tar -xzf ${tgz} --strip-components=1`, {
      stdio: "pipe",
      cwd: cachePath,
    });

    // Remove .tgz
    await rm(join(cachePath, tgz), { force: true });
  } catch (err) {
    // Clean up on failure
    await rm(cachePath, { recursive: true, force: true });
    throw new Error(
      `Failed to fetch workflow from npm:${pkgName}: ${(err as Error).message}`,
    );
  }

  return workflow.path ? join(cachePath, workflow.path) : cachePath;
}

/**
 * Generate a stable hash-based cache key from an identifier.
 */
export function getCacheKey(identifier: string): string {
  return createHash("sha256").update(identifier).digest("hex").slice(0, 16);
}
