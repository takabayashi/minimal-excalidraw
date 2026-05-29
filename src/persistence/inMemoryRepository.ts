import type { Scene, SceneRepository, SceneSummary } from "./repository";
import { summarize } from "./repository";

/**
 * In-memory implementation of `SceneRepository`. Used in tests, as the fallback
 * when localStorage is unavailable, and as a SSR-safe default.
 *
 * Stores deep clones on save and returns deep clones on load so callers can
 * freely mutate the returned data without affecting the store.
 */
export class InMemoryRepository implements SceneRepository {
  private readonly scenes = new Map<string, Scene>();

  async list(): Promise<SceneSummary[]> {
    return Array.from(this.scenes.values())
      .map(summarize)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async load(id: string): Promise<Scene | null> {
    const scene = this.scenes.get(id);
    return scene ? deepClone(scene) : null;
  }

  async save(scene: Scene): Promise<void> {
    this.scenes.set(scene.id, deepClone(scene));
  }

  async delete(id: string): Promise<void> {
    this.scenes.delete(id);
  }

  /** Test helper: total scenes currently held. */
  size(): number {
    return this.scenes.size;
  }
}

function deepClone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}
