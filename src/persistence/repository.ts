import type { SceneElement } from "../domain/elements";

/**
 * Bumped whenever the persisted shape changes in a non-additive way.
 * `LocalStorageRepository` will refuse to load scenes with a different version
 * (until a migration is added).
 */
export const SCENE_SCHEMA_VERSION = 1;

export interface Scene {
  schemaVersion: typeof SCENE_SCHEMA_VERSION;
  id: string;
  name: string;
  elements: readonly SceneElement[];
  /** Epoch ms of the most recent save. */
  updatedAt: number;
}

export interface SceneSummary {
  id: string;
  name: string;
  updatedAt: number;
}

/**
 * The backend seam. Anything above this interface is unaware of where bytes
 * actually live. Implementations include `LocalStorageRepository` (default in
 * the browser) and `InMemoryRepository` (tests, SSR, fallback). A future
 * `HttpRepository` drops in here.
 */
export interface SceneRepository {
  /** Returns scene summaries, most-recently-updated first. */
  list(): Promise<SceneSummary[]>;
  /** Returns the scene with `id`, or `null` if not found. */
  load(id: string): Promise<Scene | null>;
  /** Persists the scene; replaces any existing scene with the same id. */
  save(scene: Scene): Promise<void>;
  /** No-ops if the scene does not exist. */
  delete(id: string): Promise<void>;
}

export function summarize(scene: Scene): SceneSummary {
  return { id: scene.id, name: scene.name, updatedAt: scene.updatedAt };
}
