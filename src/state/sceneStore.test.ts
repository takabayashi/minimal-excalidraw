import { beforeEach, describe, expect, it, vi } from "vitest";
import { createShapeElement, createTextElement } from "../domain/elements";
import type { SceneElement, TextElement } from "../domain/elements";
import { DEFAULT_STYLE } from "../domain/style";
import { subscribeAutosave } from "../persistence/autosave";
import { InMemoryRepository } from "../persistence/inMemoryRepository";
import { SCENE_SCHEMA_VERSION } from "../persistence/repository";
import { createSceneStore } from "./sceneStore";
import type { SceneStore } from "./sceneStore";

function makeRect(id: string, x = 0): SceneElement {
  return createShapeElement(
    "rectangle",
    { x, y: 0, width: 10, height: 10 },
    DEFAULT_STYLE,
    { id },
  );
}

describe("sceneStore — initial state", () => {
  it("starts with empty elements, no selection, select tool, default style", () => {
    const store = createSceneStore();
    const s = store.getState();
    expect(s.elements).toEqual([]);
    expect(s.selectedId).toBeNull();
    expect(s.tool).toBe("select");
    expect(s.currentStyle).toEqual(DEFAULT_STYLE);
    expect(s.sessionId).toBeTypeOf("string");
    expect(s.name).toBe("Untitled scene");
  });
});

describe("sceneStore — addElement", () => {
  it("appends and selects the element", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    expect(store.getState().elements.map((e) => e.id)).toEqual(["a"]);
    expect(store.getState().selectedId).toBe("a");
  });

  it("preserves order across multiple adds", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().addElement(makeRect("b"));
    store.getState().addElement(makeRect("c"));
    expect(store.getState().elements.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(store.getState().selectedId).toBe("c");
  });
});

describe("sceneStore — updateElement", () => {
  it("patches the targeted element only", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().addElement(makeRect("b"));
    store.getState().updateElement("a", { x: 99 });
    const els = store.getState().elements;
    expect(els.find((e) => e.id === "a")?.x).toBe(99);
    expect(els.find((e) => e.id === "b")?.x).toBe(0);
  });

  it("is a no-op for unknown ids (does not throw)", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    expect(() =>
      store.getState().updateElement("missing", { x: 1 }),
    ).not.toThrow();
    expect(store.getState().elements).toHaveLength(1);
  });

  it("supports updating text on text elements", () => {
    const store = createSceneStore();
    const t = createTextElement(
      { x: 0, y: 0, text: "old" },
      DEFAULT_STYLE,
      { id: "t1" },
    );
    store.getState().addElement(t);
    store.getState().updateElement("t1", { text: "new" });
    const next = store.getState().elements[0] as TextElement;
    expect(next.text).toBe("new");
  });
});

describe("sceneStore — deletion", () => {
  it("deleteElement removes by id and clears selection if matching", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().addElement(makeRect("b"));
    store.getState().setSelection("a");
    store.getState().deleteElement("a");
    expect(store.getState().elements.map((e) => e.id)).toEqual(["b"]);
    expect(store.getState().selectedId).toBeNull();
  });

  it("deleteElement keeps a non-matching selection", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().addElement(makeRect("b"));
    store.getState().setSelection("b");
    store.getState().deleteElement("a");
    expect(store.getState().selectedId).toBe("b");
  });

  it("deleteSelected removes the currently selected element", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().addElement(makeRect("b"));
    store.getState().setSelection("a");
    store.getState().deleteSelected();
    expect(store.getState().elements.map((e) => e.id)).toEqual(["b"]);
    expect(store.getState().selectedId).toBeNull();
  });

  it("deleteSelected is a no-op when nothing is selected", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().setSelection(null);
    expect(() => store.getState().deleteSelected()).not.toThrow();
    expect(store.getState().elements).toHaveLength(1);
  });
});

describe("sceneStore — selection & tool", () => {
  it("setSelection updates selectedId", () => {
    const store = createSceneStore();
    store.getState().setSelection("anything");
    expect(store.getState().selectedId).toBe("anything");
    store.getState().setSelection(null);
    expect(store.getState().selectedId).toBeNull();
  });

  it("setTool to a draw tool clears the selection", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().setSelection("a");
    store.getState().setTool("rectangle");
    expect(store.getState().tool).toBe("rectangle");
    expect(store.getState().selectedId).toBeNull();
  });

  it("setTool to 'select' preserves the existing selection", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().setSelection("a");
    store.getState().setTool("select");
    expect(store.getState().selectedId).toBe("a");
  });
});

describe("sceneStore — setStyle", () => {
  it("updates currentStyle when nothing is selected (does not touch elements)", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().setSelection(null);
    store.getState().setStyle({ strokeColor: "#e03131" });
    expect(store.getState().currentStyle.strokeColor).toBe("#e03131");
    expect(store.getState().elements[0]?.style.strokeColor).toBe(
      DEFAULT_STYLE.strokeColor,
    );
  });

  it("when an element is selected, propagates style to that element AND currentStyle", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().addElement(makeRect("b"));
    store.getState().setSelection("a");
    store.getState().setStyle({ strokeWidth: "thick" });
    expect(store.getState().currentStyle.strokeWidth).toBe("thick");
    expect(
      store.getState().elements.find((e) => e.id === "a")?.style.strokeWidth,
    ).toBe("thick");
    expect(
      store.getState().elements.find((e) => e.id === "b")?.style.strokeWidth,
    ).toBe(DEFAULT_STYLE.strokeWidth);
  });

  it("merges style patches (does not replace the whole style object)", () => {
    const store = createSceneStore();
    store.getState().setStyle({ strokeColor: "#1971c2" });
    store.getState().setStyle({ strokeWidth: "thick" });
    expect(store.getState().currentStyle.strokeColor).toBe("#1971c2");
    expect(store.getState().currentStyle.strokeWidth).toBe("thick");
  });
});

describe("sceneStore — loadScene & newScene & setName", () => {
  it("loadScene replaces sessionId/name/elements and clears selection", () => {
    const store = createSceneStore();
    store.getState().addElement(makeRect("a"));
    store.getState().setSelection("a");
    store.getState().loadScene({
      schemaVersion: SCENE_SCHEMA_VERSION,
      id: "scene-x",
      name: "Loaded",
      elements: [makeRect("b"), makeRect("c")],
      updatedAt: 1,
    });
    expect(store.getState().sessionId).toBe("scene-x");
    expect(store.getState().name).toBe("Loaded");
    expect(store.getState().elements.map((e) => e.id)).toEqual(["b", "c"]);
    expect(store.getState().selectedId).toBeNull();
  });

  it("newScene resets to a fresh blank scene with a new sessionId", () => {
    const store = createSceneStore();
    const firstId = store.getState().sessionId;
    store.getState().addElement(makeRect("a"));
    store.getState().newScene();
    const next = store.getState();
    expect(next.elements).toEqual([]);
    expect(next.selectedId).toBeNull();
    expect(next.name).toBe("Untitled scene");
    expect(next.sessionId).not.toBe(firstId);
  });

  it("newScene accepts explicit id and name overrides", () => {
    const store = createSceneStore();
    store.getState().newScene({ id: "fixed", name: "Forced" });
    expect(store.getState().sessionId).toBe("fixed");
    expect(store.getState().name).toBe("Forced");
  });

  it("setName updates the scene name", () => {
    const store = createSceneStore();
    store.getState().setName("My drawing");
    expect(store.getState().name).toBe("My drawing");
  });
});

describe("sceneStore + autosave integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("changes to elements / name are persisted through the repository", async () => {
    const store: SceneStore = createSceneStore();
    const repo = new InMemoryRepository();
    subscribeAutosave(store, repo, { debounceMs: 50, now: () => 999 });

    const sessionId = store.getState().sessionId;

    store.getState().addElement(makeRect("a"));
    await vi.advanceTimersByTimeAsync(50);

    let scene = await repo.load(sessionId);
    expect(scene).not.toBeNull();
    expect(scene?.elements).toHaveLength(1);
    expect(scene?.updatedAt).toBe(999);

    store.getState().setName("renamed");
    await vi.advanceTimersByTimeAsync(50);
    scene = await repo.load(sessionId);
    expect(scene?.name).toBe("renamed");
  });

  it("changes that do NOT touch elements/name (tool, style without selection) are not persisted", async () => {
    const store: SceneStore = createSceneStore();
    const repo = new InMemoryRepository();
    const saveSpy = vi.spyOn(repo, "save");
    subscribeAutosave(store, repo, { debounceMs: 50 });

    store.getState().setTool("rectangle");
    store.getState().setStyle({ strokeColor: "#e03131" });
    await vi.advanceTimersByTimeAsync(100);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
