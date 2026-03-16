import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import type {
  AICrewState,
  Intent,
  Unit,
  EventType,
  Checkpoint,
  HatArtifact,
} from "./types.js";

function emptyState(): AICrewState {
  return {
    version: "2.0",
    intent: null,
    units: [],
    team: null,
    events: [],
  };
}

export class StateManager {
  private state: AICrewState;
  private readonly statePath: string;
  private readonly crewDir: string;

  constructor(private projectRoot: string) {
    this.crewDir = join(projectRoot, ".ai-crew");
    this.statePath = join(this.crewDir, "state.json");
    this.state = emptyState();
  }

  async load(): Promise<AICrewState> {
    try {
      const raw = await readFile(this.statePath, "utf-8");
      this.state = JSON.parse(raw) as AICrewState;
    } catch {
      this.state = emptyState();
    }
    return this.state;
  }

  async save(): Promise<void> {
    await mkdir(this.crewDir, { recursive: true });
    await writeFile(this.statePath, JSON.stringify(this.state, null, 2), "utf-8");
  }

  getState(): AICrewState {
    return this.state;
  }

  // -- Intent --

  createIntent(description: string): Intent {
    const now = new Date().toISOString();
    const id = `intent-${Date.now().toString(36)}`;
    const intent: Intent = {
      id,
      description,
      status: "elaborating",
      completionCriteria: [],
      createdAt: now,
      updatedAt: now,
    };
    this.state.intent = intent;
    this.addEvent("intent:created", { intentId: id, description });
    return intent;
  }

  updateIntent(partial: Partial<Intent>): void {
    if (!this.state.intent) return;
    Object.assign(this.state.intent, partial, {
      updatedAt: new Date().toISOString(),
    });
    this.addEvent("intent:updated", { changes: Object.keys(partial) });
  }

  // -- Units --

  addUnit(unit: Omit<Unit, "hatHistory" | "hatArtifacts" | "startedAt" | "completedAt">): Unit {
    const full: Unit = {
      ...unit,
      hatHistory: [],
      hatArtifacts: [],
      startedAt: null,
      completedAt: null,
    };
    this.state.units.push(full);
    return full;
  }

  updateUnit(unitId: string, partial: Partial<Unit>): void {
    const unit = this.state.units.find((u) => u.id === unitId);
    if (unit) Object.assign(unit, partial);
  }

  getAvailableUnits(): Unit[] {
    const completedIds = new Set(
      this.state.units.filter((u) => u.status === "complete").map((u) => u.id),
    );
    return this.state.units.filter(
      (u) =>
        u.status === "pending" &&
        u.dependencies.every((dep) => completedIds.has(dep)),
    );
  }

  // -- Hat Artifacts --

  recordHatArtifact(unitId: string, hatId: string, artifact: Partial<HatArtifact>): void {
    const unit = this.state.units.find((u) => u.id === unitId);
    if (!unit) return;
    const existing = unit.hatArtifacts.find((a) => a.hatId === hatId);
    if (existing) {
      Object.assign(existing, artifact);
    } else {
      unit.hatArtifacts.push({
        hatId,
        startedAt: null,
        completedAt: null,
        outputs: [],
        gateResults: [],
        ...artifact,
      });
    }
  }

  getHatArtifacts(unitId: string, hatId?: string): HatArtifact[] {
    const unit = this.state.units.find((u) => u.id === unitId);
    if (!unit) return [];
    if (hatId) return unit.hatArtifacts.filter((a) => a.hatId === hatId);
    return unit.hatArtifacts;
  }

  // -- Checkpoints --

  async createCheckpoint(description: string): Promise<Checkpoint> {
    const id = `cp-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;
    const cpDir = join(this.crewDir, "checkpoints");
    await mkdir(cpDir, { recursive: true });

    let mainRef = "";
    const branches: { name: string; ref: string }[] = [];
    try {
      mainRef = execSync("git rev-parse HEAD", {
        cwd: this.projectRoot,
        encoding: "utf-8",
      }).trim();
      for (const unit of this.state.units) {
        if (unit.branch) {
          try {
            const ref = execSync(`git rev-parse ${unit.branch}`, {
              cwd: this.projectRoot,
              encoding: "utf-8",
            }).trim();
            branches.push({ name: unit.branch, ref });
          } catch {
            // branch may not exist yet
          }
        }
      }
    } catch {
      // not a git repo or git not available
    }

    const checkpoint: Checkpoint = {
      id,
      description,
      createdAt: new Date().toISOString(),
      state: structuredClone(this.state),
      git: { mainRef, branches },
      changes: { added: [], modified: [], deleted: [] },
    };

    await writeFile(
      join(cpDir, `${id}.json`),
      JSON.stringify(checkpoint, null, 2),
      "utf-8",
    );
    this.addEvent("checkpoint:created", { checkpointId: id, description });
    return checkpoint;
  }

  async restoreCheckpoint(id: string): Promise<void> {
    const cpPath = join(this.crewDir, "checkpoints", `${id}.json`);
    const raw = await readFile(cpPath, "utf-8");
    const checkpoint = JSON.parse(raw) as Checkpoint;
    this.state = checkpoint.state;
    await this.save();
  }

  async listCheckpoints(): Promise<Checkpoint[]> {
    const cpDir = join(this.crewDir, "checkpoints");
    if (!existsSync(cpDir)) return [];
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(cpDir);
    const checkpoints: Checkpoint[] = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        const raw = await readFile(join(cpDir, file), "utf-8");
        checkpoints.push(JSON.parse(raw) as Checkpoint);
      }
    }
    return checkpoints.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // -- Events --

  addEvent(type: EventType, payload: Record<string, unknown>): void {
    this.state.events.push({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 events
    if (this.state.events.length > 100) {
      this.state.events = this.state.events.slice(-100);
    }
  }
}
