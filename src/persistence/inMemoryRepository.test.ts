import { describe, expect, it } from "vitest";
import { createShapeElement } from "../domain/elements";
import { DEFAULT_STYLE } from "../domain/style";
import { InMemoryRepository } from "./inMemoryRepository";
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
        { x: 0, y: 0, width: 10, height: 10 },
        DEFAULT_STYLE,
        { id: `${id}-r1` },
      ),
    ],
  };
}

describe("InMemoryRepository", () => {
  it("save then load round-trips", async () => {
    const repo = new InMemoryRepository();
    const s = makeScene("a", "First", 1);
    await repo.save(s);
    const loaded = await repo.load("a");
    expect(loaded).toEqual(s);
  });

  it("returns null for unknown ids", async () => {
    const repo = new InMemoryRepository();
    expect(await repo.load("missing")).toBeNull();
  });

  it("list returns summaries sorted by updatedAt desc", async () => {
    const repo = new InMemoryRepository();
    await repo.save(makeScene("a", "A", 100));
    await repo.save(makeScene("b", "B", 300));
    await repo.save(makeScene("c", "C", 200));
    const list = await repo.list();
    expect(list.map((s) => s.id)).toEqual(["b", "c", "a"]);
    expect(list[0]).toEqual({ id: "b", name: "B", updatedAt: 300 });
  });

  it("save replaces existing entries with the same id", async () => {
    const repo = new InMemoryRepository();
    await repo.save(makeScene("a", "First", 1));
    await repo.save(makeScene("a", "First (renamed)", 2));
    expect(repo.size()).toBe(1);
    const loaded = await repo.load("a");
    expect(loaded?.name).toBe("First (renamed)");
  });

  it("delete removes the scene; deleting a missing id is a no-op", async () => {
    const repo = new InMemoryRepository();
    await repo.save(makeScene("a", "A", 1));
    await repo.delete("a");
    expect(await repo.load("a")).toBeNull();
    await expect(repo.delete("does-not-exist")).resolves.toBeUndefined();
  });

  it("returns deep clones; mutating loaded scene does not affect later loads", async () => {
    const repo = new InMemoryRepository();
    await repo.save(makeScene("a", "A", 1));
    const loaded1 = await repo.load("a");
    expect(loaded1).not.toBeNull();
    if (loaded1) {
      loaded1.name = "MUTATED";
      (loaded1.elements as unknown as Array<{ x: number }>)[0]!.x = 9999;
    }
    const loaded2 = await repo.load("a");
    expect(loaded2?.name).toBe("A");
    expect(loaded2?.elements[0]?.x).toBe(0);
  });
});
