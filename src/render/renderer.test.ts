import { describe, expect, it } from "vitest";
import { createShapeElement, createTextElement } from "../domain/elements";
import { DEFAULT_STYLE, STROKE_STYLES } from "../domain/style";
import { createRecordingContext } from "./recordingContext";
import { render } from "./renderer";

describe("render", () => {
  it("does nothing for an empty scene", () => {
    const { ctx, commands } = createRecordingContext();
    render(ctx, { elements: [], selectedId: null });
    expect(commands).toHaveLength(0);
  });

  it("wraps each element draw in save/restore", () => {
    const { ctx, callsOf } = createRecordingContext();
    const a = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
      { id: "a" },
    );
    const b = createShapeElement(
      "ellipse",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
      { id: "b" },
    );
    render(ctx, { elements: [a, b], selectedId: null });
    expect(callsOf("save")).toHaveLength(2);
    expect(callsOf("restore")).toHaveLength(2);
  });
});

describe("render — rectangle", () => {
  it("draws a rect path and strokes; no fill when transparent", () => {
    const { ctx, callsOf } = createRecordingContext();
    const r = createShapeElement(
      "rectangle",
      { x: 1, y: 2, width: 30, height: 40 },
      DEFAULT_STYLE,
    );
    render(ctx, { elements: [r], selectedId: null });
    expect(callsOf("rect")).toHaveLength(1);
    expect(callsOf("rect")[0]?.args).toEqual([1, 2, 30, 40]);
    expect(callsOf("stroke")).toHaveLength(1);
    expect(callsOf("fill")).toHaveLength(0);
  });

  it("fills when fillColor is set (non-transparent)", () => {
    const { ctx, callsOf, lastSet } = createRecordingContext();
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      { ...DEFAULT_STYLE, fillColor: "#e03131" },
    );
    render(ctx, { elements: [r], selectedId: null });
    expect(callsOf("fill")).toHaveLength(1);
    expect(lastSet("fillStyle")).toBe("#e03131");
  });

  it("uses the normalised bbox when width/height are negative", () => {
    const { ctx, callsOf } = createRecordingContext();
    const r = createShapeElement(
      "rectangle",
      { x: 100, y: 100, width: -40, height: -30 },
      DEFAULT_STYLE,
    );
    render(ctx, { elements: [r], selectedId: null });
    expect(callsOf("rect")[0]?.args).toEqual([60, 70, 40, 30]);
  });
});

describe("render — ellipse", () => {
  it("calls ctx.ellipse with centre and radii", () => {
    const { ctx, callsOf } = createRecordingContext();
    const e = createShapeElement(
      "ellipse",
      { x: 0, y: 0, width: 100, height: 50 },
      DEFAULT_STYLE,
    );
    render(ctx, { elements: [e], selectedId: null });
    const call = callsOf("ellipse")[0];
    expect(call?.args[0]).toBe(50); // cx
    expect(call?.args[1]).toBe(25); // cy
    expect(call?.args[2]).toBe(50); // rx
    expect(call?.args[3]).toBe(25); // ry
  });
});

describe("render — diamond", () => {
  it("draws 4 vertices via moveTo/lineTo and closes the path", () => {
    const { ctx, callsOf } = createRecordingContext();
    const d = createShapeElement(
      "diamond",
      { x: 0, y: 0, width: 100, height: 100 },
      DEFAULT_STYLE,
    );
    render(ctx, { elements: [d], selectedId: null });
    expect(callsOf("moveTo")).toHaveLength(1);
    expect(callsOf("moveTo")[0]?.args).toEqual([50, 0]); // top vertex
    const linePoints = callsOf("lineTo").map((c) => c.args);
    expect(linePoints).toEqual([
      [100, 50],
      [50, 100],
      [0, 50],
    ]);
    expect(callsOf("closePath")).toHaveLength(1);
  });
});

describe("render — line", () => {
  it("draws a single segment without arrowhead", () => {
    const { ctx, callsOf } = createRecordingContext();
    const l = createShapeElement(
      "line",
      { x: 0, y: 0, width: 100, height: 0 },
      DEFAULT_STYLE,
    );
    render(ctx, { elements: [l], selectedId: null });
    expect(callsOf("moveTo")[0]?.args).toEqual([0, 0]);
    expect(callsOf("lineTo")[0]?.args).toEqual([100, 0]);
    // Line has only one beginPath (no arrow head).
    expect(callsOf("beginPath")).toHaveLength(1);
  });
});

describe("render — arrow", () => {
  it("draws the line plus two arrowhead segments", () => {
    const { ctx, callsOf } = createRecordingContext();
    const a = createShapeElement(
      "arrow",
      { x: 0, y: 0, width: 100, height: 0 },
      DEFAULT_STYLE,
    );
    render(ctx, { elements: [a], selectedId: null });
    // 1 beginPath for the body, 1 for the head -> 2 total.
    expect(callsOf("beginPath")).toHaveLength(2);
    // Head: moveTo + lineTo + lineTo (forming a "V" at the tip).
    const moveTos = callsOf("moveTo");
    const lineTos = callsOf("lineTo");
    expect(moveTos).toHaveLength(2);
    expect(lineTos).toHaveLength(3);
  });

  it("skips arrowhead for zero-length arrow", () => {
    const { ctx, callsOf } = createRecordingContext();
    const a = createShapeElement(
      "arrow",
      { x: 0, y: 0, width: 0, height: 0 },
      DEFAULT_STYLE,
    );
    render(ctx, { elements: [a], selectedId: null });
    expect(callsOf("beginPath")).toHaveLength(1);
  });
});

describe("render — text", () => {
  it("sets font from style and emits one fillText per line", () => {
    const { ctx, callsOf, lastSet } = createRecordingContext();
    const t = createTextElement(
      { x: 5, y: 7, text: "hello\nworld" },
      { ...DEFAULT_STYLE, fontFamily: "mono", fontSize: "L" },
    );
    render(ctx, { elements: [t], selectedId: null });
    expect(String(lastSet("font"))).toContain("28px");
    expect(String(lastSet("font"))).toContain("monospace");
    const fillTexts = callsOf("fillText");
    expect(fillTexts).toHaveLength(2);
    expect(fillTexts[0]?.args).toEqual(["hello", 5, 7]);
    expect(fillTexts[1]?.args[0]).toBe("world");
    // Second line shifted down by the font's px size (28).
    expect(fillTexts[1]?.args).toEqual(["world", 5, 35]);
  });

  it("uses strokeColor as the fill color for text", () => {
    const { ctx, lastSet } = createRecordingContext();
    const t = createTextElement(
      { x: 0, y: 0, text: "hi" },
      { ...DEFAULT_STYLE, strokeColor: "#1971c2" },
    );
    render(ctx, { elements: [t], selectedId: null });
    expect(lastSet("fillStyle")).toBe("#1971c2");
  });
});

describe("render — style application", () => {
  it("applies opacity, stroke color, line width", () => {
    const { ctx, lastSet } = createRecordingContext();
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      {
        ...DEFAULT_STYLE,
        strokeColor: "#9c36b5",
        strokeWidth: "thick",
        opacity: 50,
      },
    );
    render(ctx, { elements: [r], selectedId: null });
    expect(lastSet("globalAlpha")).toBe(0.5);
    expect(lastSet("strokeStyle")).toBe("#9c36b5");
    expect(lastSet("lineWidth")).toBe(4);
  });

  it("applies stroke style as a setLineDash call", () => {
    const { ctx, callsOf } = createRecordingContext();
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      { ...DEFAULT_STYLE, strokeStyle: "dashed" },
    );
    render(ctx, { elements: [r], selectedId: null });
    const dashCalls = callsOf("setLineDash");
    expect(dashCalls.length).toBeGreaterThan(0);
    expect(dashCalls[0]?.args[0]).toEqual([...STROKE_STYLES.dashed]);
  });
});

describe("render — selection outline", () => {
  it("draws a dashed outline around the selected element's bbox + padding", () => {
    const { ctx, callsOf, lastSet } = createRecordingContext();
    const r = createShapeElement(
      "rectangle",
      { x: 10, y: 20, width: 30, height: 40 },
      DEFAULT_STYLE,
      { id: "sel" },
    );
    render(ctx, { elements: [r], selectedId: "sel" });
    const strokeRects = callsOf("strokeRect");
    expect(strokeRects).toHaveLength(1);
    expect(strokeRects[0]?.args).toEqual([10 - 4, 20 - 4, 30 + 8, 40 + 8]);
    // Selection draws solid alpha on top, regardless of element opacity.
    expect(lastSet("globalAlpha")).toBe(1);
  });

  it("ignores a selectedId that does not match any element", () => {
    const { ctx, callsOf } = createRecordingContext();
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
      { id: "a" },
    );
    render(ctx, { elements: [r], selectedId: "ghost" });
    expect(callsOf("strokeRect")).toHaveLength(0);
  });
});
