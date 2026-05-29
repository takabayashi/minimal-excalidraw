import { describe, expect, it } from "vitest";
import { createShapeElement, createTextElement } from "./elements";
import {
  HIT_TOLERANCE,
  distancePointToSegment,
  findElementAt,
  getBoundingBox,
  hitTest,
  pointInDiamond,
  pointInEllipse,
  pointInRect,
} from "./geometry";
import { DEFAULT_STYLE } from "./style";

describe("getBoundingBox", () => {
  it("returns positive dims for shapes with negative width/height", () => {
    const el = createShapeElement(
      "rectangle",
      { x: 100, y: 100, width: -40, height: -30 },
      DEFAULT_STYLE,
    );
    expect(getBoundingBox(el)).toEqual({
      x: 60,
      y: 70,
      width: 40,
      height: 30,
    });
  });

  it("returns dims as-is for non-negative width/height", () => {
    const el = createShapeElement(
      "rectangle",
      { x: 10, y: 20, width: 30, height: 40 },
      DEFAULT_STYLE,
    );
    expect(getBoundingBox(el)).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    });
  });
});

describe("pointInRect", () => {
  const rect = { x: 0, y: 0, width: 10, height: 10 };
  it("includes interior", () => {
    expect(pointInRect({ x: 5, y: 5 }, rect)).toBe(true);
  });
  it("includes edges and corners", () => {
    expect(pointInRect({ x: 0, y: 0 }, rect)).toBe(true);
    expect(pointInRect({ x: 10, y: 10 }, rect)).toBe(true);
    expect(pointInRect({ x: 0, y: 5 }, rect)).toBe(true);
  });
  it("excludes outside", () => {
    expect(pointInRect({ x: -0.1, y: 5 }, rect)).toBe(false);
    expect(pointInRect({ x: 5, y: 10.1 }, rect)).toBe(false);
  });
});

describe("pointInEllipse", () => {
  const rect = { x: 0, y: 0, width: 100, height: 50 };
  it("includes the centre", () => {
    expect(pointInEllipse({ x: 50, y: 25 }, rect)).toBe(true);
  });
  it("includes points on the major/minor axes at the edge", () => {
    expect(pointInEllipse({ x: 100, y: 25 }, rect)).toBe(true);
    expect(pointInEllipse({ x: 0, y: 25 }, rect)).toBe(true);
    expect(pointInEllipse({ x: 50, y: 0 }, rect)).toBe(true);
    expect(pointInEllipse({ x: 50, y: 50 }, rect)).toBe(true);
  });
  it("excludes corners of the bbox", () => {
    expect(pointInEllipse({ x: 0, y: 0 }, rect)).toBe(false);
    expect(pointInEllipse({ x: 100, y: 50 }, rect)).toBe(false);
  });
  it("returns false on degenerate rect", () => {
    expect(pointInEllipse({ x: 0, y: 0 }, { x: 0, y: 0, width: 0, height: 50 })).toBe(false);
    expect(pointInEllipse({ x: 0, y: 0 }, { x: 0, y: 0, width: 50, height: 0 })).toBe(false);
  });
});

describe("pointInDiamond", () => {
  const rect = { x: 0, y: 0, width: 100, height: 100 };
  // Diamond vertices at (50,0), (100,50), (50,100), (0,50)
  it("includes the centre", () => {
    expect(pointInDiamond({ x: 50, y: 50 }, rect)).toBe(true);
  });
  it("includes diamond vertices", () => {
    expect(pointInDiamond({ x: 50, y: 0 }, rect)).toBe(true);
    expect(pointInDiamond({ x: 100, y: 50 }, rect)).toBe(true);
    expect(pointInDiamond({ x: 50, y: 100 }, rect)).toBe(true);
    expect(pointInDiamond({ x: 0, y: 50 }, rect)).toBe(true);
  });
  it("excludes bbox corners", () => {
    expect(pointInDiamond({ x: 0, y: 0 }, rect)).toBe(false);
    expect(pointInDiamond({ x: 100, y: 100 }, rect)).toBe(false);
  });
  it("returns false on degenerate rect", () => {
    expect(pointInDiamond({ x: 0, y: 0 }, { x: 0, y: 0, width: 0, height: 1 })).toBe(false);
  });
});

describe("distancePointToSegment", () => {
  it("equals distance to endpoint when projection is outside segment", () => {
    const d = distancePointToSegment(
      { x: -5, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    );
    expect(d).toBe(5);
  });
  it("equals perpendicular distance when projection is inside segment", () => {
    const d = distancePointToSegment(
      { x: 5, y: 3 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    );
    expect(d).toBe(3);
  });
  it("handles a zero-length segment as distance to that point", () => {
    const d = distancePointToSegment(
      { x: 3, y: 4 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    );
    expect(d).toBe(5);
  });
});

describe("hitTest", () => {
  const style = DEFAULT_STYLE;

  it("rectangle: bbox containment", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 10, y: 10, width: 100, height: 50 },
      style,
    );
    expect(hitTest({ x: 50, y: 40 }, r)).toBe(true);
    expect(hitTest({ x: 150, y: 40 }, r)).toBe(false);
  });

  it("ellipse: only inside ellipse, not bbox corners", () => {
    const e = createShapeElement(
      "ellipse",
      { x: 0, y: 0, width: 100, height: 50 },
      style,
    );
    expect(hitTest({ x: 50, y: 25 }, e)).toBe(true);
    expect(hitTest({ x: 0, y: 0 }, e)).toBe(false);
  });

  it("diamond: only inside rhombus", () => {
    const d = createShapeElement(
      "diamond",
      { x: 0, y: 0, width: 100, height: 100 },
      style,
    );
    expect(hitTest({ x: 50, y: 50 }, d)).toBe(true);
    expect(hitTest({ x: 5, y: 5 }, d)).toBe(false);
  });

  it("line: tolerant within HIT_TOLERANCE px of the segment", () => {
    const l = createShapeElement(
      "line",
      { x: 0, y: 0, width: 100, height: 0 },
      style,
    );
    expect(hitTest({ x: 50, y: HIT_TOLERANCE - 0.1 }, l)).toBe(true);
    expect(hitTest({ x: 50, y: HIT_TOLERANCE + 0.1 }, l)).toBe(false);
    expect(hitTest({ x: -5, y: 0 }, l)).toBe(true); // within tolerance of endpoint
    expect(hitTest({ x: -100, y: 0 }, l)).toBe(false);
  });

  it("arrow: same as line for hit-testing", () => {
    const a = createShapeElement(
      "arrow",
      { x: 0, y: 0, width: 0, height: 100 },
      style,
    );
    expect(hitTest({ x: 0, y: 50 }, a)).toBe(true);
    expect(hitTest({ x: 50, y: 50 }, a)).toBe(false);
  });

  it("text: bbox containment", () => {
    const t = createTextElement(
      { x: 10, y: 10, width: 80, height: 20, text: "hi" },
      style,
    );
    expect(hitTest({ x: 50, y: 20 }, t)).toBe(true);
    expect(hitTest({ x: 200, y: 20 }, t)).toBe(false);
  });

  it("works with negative width/height (uses normalised bbox)", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 100, y: 100, width: -40, height: -30 },
      style,
    );
    expect(hitTest({ x: 80, y: 80 }, r)).toBe(true);
    expect(hitTest({ x: 50, y: 50 }, r)).toBe(false);
  });
});

describe("findElementAt", () => {
  it("returns the topmost element under the point", () => {
    const back = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 100, height: 100 },
      DEFAULT_STYLE,
      { id: "back" },
    );
    const front = createShapeElement(
      "rectangle",
      { x: 50, y: 50, width: 100, height: 100 },
      DEFAULT_STYLE,
      { id: "front" },
    );
    const result = findElementAt({ x: 60, y: 60 }, [back, front]);
    expect(result?.id).toBe("front");
  });

  it("returns null when nothing matches", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
    );
    expect(findElementAt({ x: 100, y: 100 }, [r])).toBeNull();
  });
});
