import type {
  RunRegistry,
  RunManifest,
  CurrentStateResponse,
  FileTreeNode,
  AidlcStateResponse,
  ConfigYaml,
} from "@/types";

const API_BASE = "/api";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ============================================================
// Runs API
// ============================================================

export async function fetchRuns(): Promise<RunRegistry> {
  return fetchJson<RunRegistry>(`${API_BASE}/runs`);
}

export async function fetchRunById(runId: string): Promise<RunManifest> {
  return fetchJson<RunManifest>(`${API_BASE}/runs/${encodeURIComponent(runId)}`);
}

// ============================================================
// Current State API
// ============================================================

export async function fetchCurrentState(): Promise<CurrentStateResponse> {
  return fetchJson<CurrentStateResponse>(`${API_BASE}/current`);
}

// ============================================================
// AIDLC API
// ============================================================

export async function fetchAidlcDocs(): Promise<FileTreeNode[]> {
  return fetchJson<FileTreeNode[]>(`${API_BASE}/aidlc/docs`);
}

export async function fetchAidlcDocContent(path: string): Promise<{ path: string; content: string }> {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return fetchJson<{ path: string; content: string }>(
    `${API_BASE}/aidlc/docs/${encodedPath}`
  );
}

export async function fetchAidlcState(): Promise<AidlcStateResponse> {
  return fetchJson<AidlcStateResponse>(`${API_BASE}/aidlc/state`);
}

// ============================================================
// Config API
// ============================================================

export async function fetchConfig(): Promise<ConfigYaml> {
  return fetchJson<ConfigYaml>(`${API_BASE}/config`);
}
