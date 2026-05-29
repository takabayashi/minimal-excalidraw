import type { SceneElement } from "../domain/elements";
import type { Scene, SceneRepository } from "./repository";
import { SCENE_SCHEMA_VERSION } from "./repository";

/**
 * Subset of state that autosave reads. Any store implementing this shape
 * can be wired up — keeps `autosave` decoupled from the concrete Zustand
 * store (and easier to test in isolation).
 */
export interface AutosavableState {
  sessionId: string;
  name: string;
  elements: readonly SceneElement[];
}

export interface StoreLike<T> {
  getState(): T;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

export interface AutosaveOptions {
  /** Default 400 ms — feels instant but coalesces rapid pointer-move updates. */
  debounceMs?: number;
  /** Override for tests; defaults to `Date.now`. */
  now?: () => number;
  /** Override for tests; defaults to global `setTimeout`/`clearTimeout`. */
  timer?: {
    set: (fn: () => void, ms: number) => unknown;
    clear: (handle: unknown) => void;
  };
  /** Optional error sink (e.g. show a toast). Defaults to `console.error`. */
  onError?: (err: unknown) => void;
}

const DEFAULT_DEBOUNCE_MS = 400;

/**
 * Subscribe to a store and persist scene changes to the repository, debounced.
 * Returns an unsubscribe function which also cancels any pending save.
 *
 * Triggers a save when `elements` or `name` change. Tool selection or current
 * style changes do NOT trigger a save (they are session-local UI state).
 */
export function subscribeAutosave<T extends AutosavableState>(
  store: StoreLike<T>,
  repository: SceneRepository,
  options: AutosaveOptions = {},
): () => void {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const now = options.now ?? (() => Date.now());
  const set =
    options.timer?.set ??
    ((fn, ms) => setTimeout(fn, ms) as unknown);
  const clear =
    options.timer?.clear ??
    ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const onError =
    options.onError ??
    ((err: unknown) => {
      console.error("[autosave] save failed", err);
    });

  let timer: unknown = null;
  // Start in sync with the current state so no save is emitted unless
  // something actually changes after subscription.
  const initial = store.getState();
  let lastElements: readonly SceneElement[] = initial.elements;
  let lastName: string = initial.name;

  const unsubscribe = store.subscribe((state) => {
    const changed =
      state.elements !== lastElements || state.name !== lastName;
    if (!changed) return;
    lastElements = state.elements;
    lastName = state.name;
    if (timer) clear(timer);
    timer = set(() => {
      timer = null;
      const scene: Scene = {
        schemaVersion: SCENE_SCHEMA_VERSION,
        id: state.sessionId,
        name: state.name,
        elements: state.elements,
        updatedAt: now(),
      };
      repository.save(scene).catch(onError);
    }, debounceMs);
  });

  return () => {
    if (timer) clear(timer);
    timer = null;
    unsubscribe();
  };
}
