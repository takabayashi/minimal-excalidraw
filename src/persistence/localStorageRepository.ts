import type { Scene, SceneRepository, SceneSummary } from "./repository";
import { SCENE_SCHEMA_VERSION, summarize } from "./repository";

const SCENE_KEY_PREFIX = "mini-excalidraw:scene:";
const INDEX_KEY = "mini-excalidraw:index";

/** Minimal Storage shim for environments without `window.localStorage`. */
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function getDefaultStorage(): Storage {
  if (typeof window === "undefined") return new MemoryStorage();
  try {
    const probe = "__mini_excalidraw_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

function sceneKey(id: string): string {
  return `${SCENE_KEY_PREFIX}${id}`;
}

/**
 * Browser-localStorage-backed `SceneRepository`.
 *
 * - Each scene is stored at `mini-excalidraw:scene:<id>` as JSON.
 * - The index `mini-excalidraw:index` is a JSON `SceneSummary[]` kept in sync
 *   so we never need to scan all keys to list.
 * - Scenes with a `schemaVersion` other than `SCENE_SCHEMA_VERSION` resolve to
 *   `null` on load (treated as "needs migration").
 * - All Storage calls are wrapped in try/catch; quota or DOMException errors
 *   surface as rejected promises rather than crashes.
 */
export class LocalStorageRepository implements SceneRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = getDefaultStorage()) {
    this.storage = storage;
  }

  async list(): Promise<SceneSummary[]> {
    const index = this.readIndex();
    return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async load(id: string): Promise<Scene | null> {
    const raw = this.storage.getItem(sceneKey(id));
    if (raw == null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!isSceneShape(parsed)) return null;
    if (parsed.schemaVersion !== SCENE_SCHEMA_VERSION) return null;
    return parsed;
  }

  async save(scene: Scene): Promise<void> {
    if (scene.schemaVersion !== SCENE_SCHEMA_VERSION) {
      throw new Error(
        `Refusing to save scene with schemaVersion=${scene.schemaVersion}; expected ${SCENE_SCHEMA_VERSION}`,
      );
    }
    const json = JSON.stringify(scene);
    try {
      this.storage.setItem(sceneKey(scene.id), json);
    } catch (err) {
      throw new Error(
        `Failed to persist scene ${scene.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const index = this.readIndex().filter((s) => s.id !== scene.id);
    index.push(summarize(scene));
    this.writeIndex(index);
  }

  async delete(id: string): Promise<void> {
    this.storage.removeItem(sceneKey(id));
    const index = this.readIndex().filter((s) => s.id !== id);
    this.writeIndex(index);
  }

  // ---- internal -------------------------------------------------------------

  private readIndex(): SceneSummary[] {
    const raw = this.storage.getItem(INDEX_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isSceneSummary);
    } catch {
      return [];
    }
  }

  private writeIndex(index: readonly SceneSummary[]): void {
    try {
      this.storage.setItem(INDEX_KEY, JSON.stringify(index));
    } catch {
      // Index is recoverable from individual keys; swallow quota errors here.
    }
  }
}

function isSceneSummary(value: unknown): value is SceneSummary {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.updatedAt === "number"
  );
}

function isSceneShape(value: unknown): value is Scene {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.updatedAt === "number" &&
    typeof v.schemaVersion === "number" &&
    Array.isArray(v.elements)
  );
}
