import { create } from "zustand";
import type { StoreApi, UseBoundStore } from "zustand";
import type {
  ElementPatch,
  SceneElement,
  SceneElementType,
} from "../domain/elements";
import {
  generateId,
  updateElement as patchElement,
} from "../domain/elements";
import type { Style } from "../domain/style";
import { DEFAULT_STYLE } from "../domain/style";
import type { Scene } from "../persistence/repository";

/**
 * The "select" tool selects/moves existing elements. Every other tool draws an
 * element of the same type. (The "text" tool spawns a text element.)
 */
export type Tool = "select" | SceneElementType;

export const ALL_TOOLS: readonly Tool[] = [
  "select",
  "rectangle",
  "ellipse",
  "diamond",
  "line",
  "arrow",
  "text",
];

export interface SceneState {
  // ---------- data (persisted) ----------
  sessionId: string;
  name: string;
  elements: readonly SceneElement[];
  selectedId: string | null;

  // ---------- ui-only ----------
  tool: Tool;
  currentStyle: Style;

  // ---------- actions ----------
  addElement(element: SceneElement): void;
  updateElement(id: string, patch: ElementPatch): void;
  deleteElement(id: string): void;
  deleteSelected(): void;
  setSelection(id: string | null): void;
  setTool(tool: Tool): void;
  setStyle(patch: Partial<Style>): void;
  setName(name: string): void;
  loadScene(scene: Scene): void;
  newScene(options?: NewSceneOptions): void;
}

export interface NewSceneOptions {
  name?: string;
  id?: string;
}

export const DEFAULT_SCENE_NAME = "Untitled scene";

interface InitialData {
  sessionId: string;
  name: string;
  elements: readonly SceneElement[];
  selectedId: string | null;
}

function initialData(): InitialData {
  return {
    sessionId: generateId(),
    name: DEFAULT_SCENE_NAME,
    elements: [],
    selectedId: null,
  };
}

export type SceneStore = UseBoundStore<StoreApi<SceneState>>;

/**
 * Create an isolated store instance. Tests use this to avoid cross-test
 * leakage; the app uses the `useSceneStore` singleton below.
 */
export function createSceneStore(): SceneStore {
  return create<SceneState>()((set, get) => ({
    ...initialData(),
    tool: "select",
    currentStyle: { ...DEFAULT_STYLE },

    addElement(element) {
      set((state) => ({
        elements: [...state.elements, element],
        selectedId: element.id,
      }));
    },

    updateElement(id, patch) {
      set((state) => ({
        elements: state.elements.map((el) =>
          el.id === id ? patchElement(el, patch) : el,
        ),
      }));
    },

    deleteElement(id) {
      set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      }));
    },

    deleteSelected() {
      const { selectedId, deleteElement } = get();
      if (selectedId) deleteElement(selectedId);
    },

    setSelection(id) {
      set({ selectedId: id });
    },

    setTool(tool) {
      // Switching tools clears any active selection so the StylePanel
      // doesn't continue to drive a previously-selected element.
      set((state) => ({
        tool,
        selectedId: tool === "select" ? state.selectedId : null,
      }));
    },

    setStyle(patch) {
      set((state) => {
        const nextStyle: Style = { ...state.currentStyle, ...patch };
        // If something is selected, also push the change onto that element.
        const elements = state.selectedId
          ? state.elements.map((el) =>
              el.id === state.selectedId
                ? patchElement(el, { style: nextStyle })
                : el,
            )
          : state.elements;
        return { currentStyle: nextStyle, elements };
      });
    },

    setName(name) {
      set({ name });
    },

    loadScene(scene) {
      set({
        sessionId: scene.id,
        name: scene.name,
        elements: [...scene.elements],
        selectedId: null,
      });
    },

    newScene(options) {
      set({
        sessionId: options?.id ?? generateId(),
        name: options?.name ?? DEFAULT_SCENE_NAME,
        elements: [],
        selectedId: null,
      });
    },
  }));
}

/** Singleton store used by the running app. */
export const useSceneStore: SceneStore = createSceneStore();
