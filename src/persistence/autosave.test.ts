import { beforeEach, describe, expect, it, vi } from "vitest";
import { createShapeElement } from "../domain/elements";
import type { SceneElement } from "../domain/elements";
import { DEFAULT_STYLE } from "../domain/style";
import { subscribeAutosave } from "./autosave";
import type { AutosavableState, StoreLike } from "./autosave";
import { InMemoryRepository } from "./inMemoryRepository";

interface TestState extends AutosavableState {}

/**
 * Tiny synchronous store mock: holds state, supports `getState`, and
 * notifies listeners when `setState` is called.
 */
function makeTestStore(initial: TestState): StoreLike<TestState> & {
  setState: (next: TestState) => void;
} {
  let state = initial;
  const listeners = new Set<(state: TestState, prev: TestState) => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setState(next) {
      const prev = state;
      state = next;
      listeners.forEach((l) => l(state, prev));
    },
  };
}

function makeRect(id: string, x = 0): SceneElement {
  return createShapeElement(
    "rectangle",
    { x, y: 0, width: 10, height: 10 },
    DEFAULT_STYLE,
    { id },
  );
}

describe("subscribeAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("debounces rapid changes and saves once with the latest state", async () => {
    const repo = new InMemoryRepository();
    const saveSpy = vi.spyOn(repo, "save");
    const store = makeTestStore({
      sessionId: "s1",
      name: "scene",
      elements: [],
    });
    subscribeAutosave(store, repo, { debounceMs: 100, now: () => 1234 });

    store.setState({
      sessionId: "s1",
      name: "scene",
      elements: [makeRect("a")],
    });
    store.setState({
      sessionId: "s1",
      name: "scene",
      elements: [makeRect("a"), makeRect("b")],
    });

    expect(saveSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(99);
    expect(saveSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0]?.[0]).toMatchObject({
      schemaVersion: 1,
      id: "s1",
      name: "scene",
      updatedAt: 1234,
    });
    expect(saveSpy.mock.calls[0]?.[0].elements).toHaveLength(2);
  });

  it("saves once for each settled change after the debounce", async () => {
    const repo = new InMemoryRepository();
    const saveSpy = vi.spyOn(repo, "save");
    const store = makeTestStore({
      sessionId: "s1",
      name: "scene",
      elements: [],
    });
    subscribeAutosave(store, repo, { debounceMs: 50 });

    store.setState({
      sessionId: "s1",
      name: "scene",
      elements: [makeRect("a")],
    });
    await vi.advanceTimersByTimeAsync(50);
    store.setState({
      sessionId: "s1",
      name: "scene",
      elements: [makeRect("a"), makeRect("b")],
    });
    await vi.advanceTimersByTimeAsync(50);
    expect(saveSpy).toHaveBeenCalledTimes(2);
  });

  it("triggers a save when only the scene name changes", async () => {
    const repo = new InMemoryRepository();
    const saveSpy = vi.spyOn(repo, "save");
    const elements = [makeRect("a")];
    const store = makeTestStore({
      sessionId: "s1",
      name: "old",
      elements,
    });
    subscribeAutosave(store, repo, { debounceMs: 10 });
    store.setState({ sessionId: "s1", name: "new", elements });
    await vi.advanceTimersByTimeAsync(10);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0]?.[0].name).toBe("new");
  });

  it("does NOT save when neither elements nor name changed (no-op store updates)", async () => {
    const repo = new InMemoryRepository();
    const saveSpy = vi.spyOn(repo, "save");
    const elements = [makeRect("a")];
    const store = makeTestStore({
      sessionId: "s1",
      name: "scene",
      elements,
    });
    subscribeAutosave(store, repo, { debounceMs: 10 });
    // Same elements reference and same name -> autosave should ignore.
    store.setState({ sessionId: "s1", name: "scene", elements });
    await vi.advanceTimersByTimeAsync(20);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("unsubscribe cancels a pending save", async () => {
    const repo = new InMemoryRepository();
    const saveSpy = vi.spyOn(repo, "save");
    const store = makeTestStore({
      sessionId: "s1",
      name: "scene",
      elements: [],
    });
    const unsubscribe = subscribeAutosave(store, repo, { debounceMs: 100 });
    store.setState({
      sessionId: "s1",
      name: "scene",
      elements: [makeRect("a")],
    });
    unsubscribe();
    await vi.advanceTimersByTimeAsync(500);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("invokes onError when the repository save rejects", async () => {
    const repo = new InMemoryRepository();
    vi.spyOn(repo, "save").mockRejectedValueOnce(new Error("boom"));
    const onError = vi.fn();
    const store = makeTestStore({
      sessionId: "s1",
      name: "scene",
      elements: [],
    });
    subscribeAutosave(store, repo, { debounceMs: 1, onError });
    store.setState({
      sessionId: "s1",
      name: "scene",
      elements: [makeRect("a")],
    });
    await vi.advanceTimersByTimeAsync(1);
    // Allow the rejected promise's catch handler to run.
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
