import { beforeEach, describe, expect, it } from "vitest";
import { createShapeElement } from "../domain/elements";
import { DEFAULT_STYLE } from "../domain/style";
import { LocalStorageRepository } from "./localStorageRepository";
import type { Scene } from "./repository";
import { SCENE_SCHEMA_VERSION } from "./repository";

function makeScene(id: string, name: string, updatedAt: number): Scene {
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    id,
    name,
    updatedAt,
    elements: [
      createShapeElement(
        "rectangle",
        { x: 1, y: 2, width: 3, height: 4 },
        DEFAULT_STYLE,
        { id: `${id}-r1` },
      ),
    ],
  };
}

describe("LocalStorageRepository", () => {
  let storage: Storage;
  let repo: LocalStorageRepository;

  beforeEach(() => {
    // jsdom provides window.localStorage; clear it between tests.
    storage = window.localStorage;
    storage.clear();
    repo = new LocalStorageRepository(storage);
  });

  it("save then load round-trips", async () => {
    const s = makeScene("a", "Hello", 100);
    await repo.save(s);
    const loaded = await repo.load("a");
    expect(loaded).toEqual(s);
  });

  it("returns null for unknown ids", async () => {
    expect(await repo.load("missing")).toBeNull();
  });

  it("list returns summaries sorted by updatedAt desc", async () => {
    await repo.save(makeScene("a", "A", 100));
    await repo.save(makeScene("b", "B", 300));
    await repo.save(makeScene("c", "C", 200));
    const list = await repo.list();
    expect(list.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("save replaces the index entry instead of duplicating", async () => {
    await repo.save(makeScene("a", "v1", 1));
    await repo.save(makeScene("a", "v2", 2));
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("v2");
  });

  it("delete removes both the scene and its index entry", async () => {
    await repo.save(makeScene("a", "A", 1));
    await repo.save(makeScene("b", "B", 2));
    await repo.delete("a");
    expect(await repo.load("a")).toBeNull();
    const list = await repo.list();
    expect(list.map((s) => s.id)).toEqual(["b"]);
  });

  it("load returns null when the stored JSON is corrupt", async () => {
    storage.setItem("mini-excalidraw:scene:bad", "{not json");
    expect(await repo.load("bad")).toBeNull();
  });

  it("load returns null when schemaVersion does not match", async () => {
    const wrong = { ...makeScene("v0", "old", 1), schemaVersion: 0 };
    storage.setItem("mini-excalidraw:scene:v0", JSON.stringify(wrong));
    expect(await repo.load("v0")).toBeNull();
  });

  it("load returns null for stored objects missing required fields", async () => {
    storage.setItem(
      "mini-excalidraw:scene:incomplete",
      JSON.stringify({ schemaVersion: 1, id: "incomplete" }),
    );
    expect(await repo.load("incomplete")).toBeNull();
  });

  it("save throws when scene has a wrong schemaVersion", async () => {
    const bad = { ...makeScene("a", "A", 1), schemaVersion: 999 } as unknown as Scene;
    await expect(repo.save(bad)).rejects.toThrow(/schemaVersion/);
  });

  it("list tolerates a corrupt index by treating it as empty", async () => {
    storage.setItem("mini-excalidraw:index", "not-json");
    expect(await repo.list()).toEqual([]);
  });

  it("list filters out non-summary entries from a partially-corrupt index", async () => {
    storage.setItem(
      "mini-excalidraw:index",
      JSON.stringify([
        { id: "ok", name: "Ok", updatedAt: 1 },
        { not: "a-summary" },
        null,
      ]),
    );
    const list = await repo.list();
    expect(list).toEqual([{ id: "ok", name: "Ok", updatedAt: 1 }]);
  });

  it("save surfaces storage failures (e.g. quota) as rejected promises", async () => {
    const failing: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    const r = new LocalStorageRepository(failing);
    await expect(r.save(makeScene("a", "A", 1))).rejects.toThrow(/Failed to persist/);
  });

  it("constructs without throwing when no Storage is provided (uses default)", () => {
    expect(() => new LocalStorageRepository()).not.toThrow();
  });
});
