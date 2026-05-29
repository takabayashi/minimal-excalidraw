import type { SceneElement } from "./elements";

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Hit-test tolerance (px) for line/arrow segments and zero-area shapes.
 * Picked to feel forgiving on touch / fine-pointer devices.
 */
export const HIT_TOLERANCE = 6;

/**
 * Returns the axis-aligned bounding box of an element, with non-negative
 * width/height regardless of the element's signed dimensions.
 */
export function getBoundingBox(element: SceneElement): BoundingBox {
  const x = element.width >= 0 ? element.x : element.x + element.width;
  const y = element.height >= 0 ? element.y : element.y + element.height;
  return {
    x,
    y,
    width: Math.abs(element.width),
    height: Math.abs(element.height),
  };
}

/** True if `point` lies inside or exactly on the edge of the rect. */
export function pointInRect(point: Point, rect: BoundingBox): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * True if `point` lies inside the axis-aligned ellipse inscribed in `rect`.
 * Degenerate rect (zero width or height) returns false.
 */
export function pointInEllipse(point: Point, rect: BoundingBox): boolean {
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const cx = rect.x + rx;
  const cy = rect.y + ry;
  const nx = (point.x - cx) / rx;
  const ny = (point.y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

/**
 * True if `point` lies inside the rhombus (diamond) inscribed in `rect`,
 * with vertices at the four edge midpoints. Degenerate rect returns false.
 */
export function pointInDiamond(point: Point, rect: BoundingBox): boolean {
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const cx = rect.x + rx;
  const cy = rect.y + ry;
  return Math.abs(point.x - cx) / rx + Math.abs(point.y - cy) / ry <= 1;
}

/**
 * Shortest distance from `point` to the segment AB (inclusive of endpoints).
 * For a zero-length segment returns the distance to point A.
 */
export function distancePointToSegment(
  point: Point,
  a: Point,
  b: Point,
): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  let t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * abx;
  const projY = a.y + t * aby;
  return Math.hypot(point.x - projX, point.y - projY);
}

/**
 * True if `point` hits `element`. For closed shapes (rect/ellipse/diamond/text)
 * this means "inside or on the edge". For line/arrow, distance from the point
 * to the segment must be <= HIT_TOLERANCE.
 */
export function hitTest(point: Point, element: SceneElement): boolean {
  const bbox = getBoundingBox(element);
  switch (element.type) {
    case "rectangle":
    case "text":
      return pointInRect(point, bbox);
    case "ellipse":
      return pointInEllipse(point, bbox);
    case "diamond":
      return pointInDiamond(point, bbox);
    case "line":
    case "arrow": {
      const a: Point = { x: element.x, y: element.y };
      const b: Point = {
        x: element.x + element.width,
        y: element.y + element.height,
      };
      return distancePointToSegment(point, a, b) <= HIT_TOLERANCE;
    }
  }
}

/**
 * Returns the topmost element at `point` (i.e. the last one drawn that hits)
 * or null if none. Iterates from the end of `elements` so later elements are
 * "on top" — matching the renderer's draw order.
 */
export function findElementAt(
  point: Point,
  elements: readonly SceneElement[],
): SceneElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el && hitTest(point, el)) return el;
  }
  return null;
}
