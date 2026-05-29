import { afterEach, describe, expect, it } from "vitest";
import {
  ALL_ELEMENT_TYPES,
  SHAPE_ELEMENT_TYPES,
  createShapeElement,
  createTextElement,
  generateId,
  isTextElement,
  normalizeElement,
  setIdGenerator,
  translateElement,
  updateElement,
  type Rectangle,
  type SceneElement,
  type ShapeElementType,
  type TextElement,
} from "./elements";
import { DEFAULT_STYLE } from "./style";

describe("ALL_ELEMENT_TYPES / SHAPE_ELEMENT_TYPES", () => {
  it("declares the five shape types and text", () => {
    expect(SHAPE_ELEMENT_TYPES).toEqual([
      "rectangle",
      "ellipse",
      "diamond",
      "line",
      "arrow",
    ]);
    expect(ALL_ELEMENT_TYPES).toEqual([...SHAPE_ELEMENT_TYPES, "text"]);
  });
});

describe("generateId / setIdGenerator", () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it("yields unique strings", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(generateId());
    expect(ids.size).toBe(50);
  });

  it("can be replaced and restored", () => {
    let n = 0;
    restore = setIdGenerator(() => `fixed-${++n}`);
    expect(generateId()).toBe("fixed-1");
    expect(generateId()).toBe("fixed-2");
    restore();
    restore = null;
    expect(generateId()).not.toMatch(/^fixed-/);
  });
});

describe("createShapeElement", () => {
  it("creates each of the 5 shape types with a fresh id and default zero size", () => {
    for (const type of SHAPE_ELEMENT_TYPES) {
      const el = createShapeElement(type, { x: 10, y: 20 }, DEFAULT_STYLE);
      expect(el.type).toBe(type);
      expect(el.x).toBe(10);
      expect(el.y).toBe(20);
      expect(el.width).toBe(0);
      expect(el.height).toBe(0);
      expect(el.id).toBeTypeOf("string");
      expect(el.id.length).toBeGreaterThan(0);
    }
  });

  it("accepts width/height in init", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 1, y: 2, width: 30, height: 40 },
      DEFAULT_STYLE,
    );
    expect(r.width).toBe(30);
    expect(r.height).toBe(40);
  });

  it("clones the style so mutations to the input don't leak", () => {
    const style = { ...DEFAULT_STYLE };
    const r = createShapeElement("rectangle", { x: 0, y: 0 }, style);
    style.strokeColor = "#ffffff";
    expect(r.style.strokeColor).not.toBe("#ffffff");
  });

  it("accepts an explicit id via options", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0 },
      DEFAULT_STYLE,
      { id: "abc" },
    );
    expect(r.id).toBe("abc");
  });
});

describe("createTextElement", () => {
  it("creates a text element with payload", () => {
    const t = createTextElement(
      { x: 5, y: 6, text: "hi" },
      DEFAULT_STYLE,
    );
    expect(t.type).toBe("text");
    expect(t.text).toBe("hi");
  });
});

describe("updateElement", () => {
  it("applies x/y/width/height/style patches and preserves id+type", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
      { id: "r1" },
    );
    const updated = updateElement(r, {
      x: 5,
      y: 6,
      width: 100,
      height: 200,
      style: { ...DEFAULT_STYLE, strokeColor: "#e03131" },
    });
    expect(updated.id).toBe("r1");
    expect(updated.type).toBe("rectangle");
    expect(updated.x).toBe(5);
    expect(updated.y).toBe(6);
    expect(updated.width).toBe(100);
    expect(updated.height).toBe(200);
    expect(updated.style.strokeColor).toBe("#e03131");
    // input is not mutated
    expect(r.x).toBe(0);
    expect(r.style.strokeColor).toBe(DEFAULT_STYLE.strokeColor);
  });

  it("only writes text on text elements", () => {
    const t = createTextElement({ x: 0, y: 0, text: "a" }, DEFAULT_STYLE);
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0 },
      DEFAULT_STYLE,
    );
    const tNext = updateElement(t, { text: "b" }) as TextElement;
    const rNext = updateElement(r as SceneElement, { text: "b" }) as Rectangle;
    expect(tNext.text).toBe("b");
    expect((rNext as unknown as { text?: string }).text).toBeUndefined();
  });

  it("ignores undefined patch fields", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 1, y: 2, width: 3, height: 4 },
      DEFAULT_STYLE,
    );
    const next = updateElement(r, {});
    expect(next).toEqual(r);
    expect(next).not.toBe(r); // returns a new object
  });
});

describe("translateElement", () => {
  it("shifts x and y by (dx, dy)", () => {
    const r = createShapeElement("rectangle", { x: 5, y: 10 }, DEFAULT_STYLE);
    const moved = translateElement(r, 3, -2);
    expect(moved.x).toBe(8);
    expect(moved.y).toBe(8);
    expect(moved.width).toBe(r.width);
    expect(moved.height).toBe(r.height);
  });
});

describe("normalizeElement", () => {
  it("flips negative width/height for shape kinds", () => {
    for (const type of [
      "rectangle",
      "ellipse",
      "diamond",
    ] as ShapeElementType[]) {
      const el = createShapeElement(
        type,
        { x: 100, y: 100, width: -40, height: -30 },
        DEFAULT_STYLE,
      );
      const n = normalizeElement(el);
      expect(n.x).toBe(60);
      expect(n.y).toBe(70);
      expect(n.width).toBe(40);
      expect(n.height).toBe(30);
    }
  });

  it("flips negative size for text elements as well", () => {
    const t = createTextElement(
      { x: 50, y: 50, width: -20, height: -10, text: "hi" },
      DEFAULT_STYLE,
    );
    const n = normalizeElement(t);
    expect(n.x).toBe(30);
    expect(n.y).toBe(40);
    expect(n.width).toBe(20);
    expect(n.height).toBe(10);
  });

  it("preserves signed deltas for line/arrow (direction matters)", () => {
    for (const type of ["line", "arrow"] as const) {
      const el = createShapeElement(
        type,
        { x: 100, y: 100, width: -40, height: -30 },
        DEFAULT_STYLE,
      );
      const n = normalizeElement(el);
      expect(n).toBe(el); // returns the same reference (no change)
    }
  });

  it("returns the same reference when no normalisation needed", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
    );
    expect(normalizeElement(r)).toBe(r);
  });
});

describe("isTextElement", () => {
  it("narrows the union", () => {
    const t = createTextElement({ x: 0, y: 0, text: "hi" }, DEFAULT_STYLE);
    const r = createShapeElement("rectangle", { x: 0, y: 0 }, DEFAULT_STYLE);
    expect(isTextElement(t)).toBe(true);
    expect(isTextElement(r)).toBe(false);
  });
});
