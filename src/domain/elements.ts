import type { Style } from "./style";

export type SceneElementType =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "text";

/**
 * The "shape kinds" accepted by `createShapeElement`. Text has its own
 * constructor because it carries a `text` payload.
 */
export type ShapeElementType = Exclude<SceneElementType, "text">;

export interface BaseElement {
  readonly id: string;
  readonly type: SceneElementType;
  /** Top-left x in scene coordinates. May be negative during a draft drag. */
  x: number;
  /** Top-left y in scene coordinates. May be negative during a draft drag. */
  y: number;
  /**
   * Width (px). For shapes (rectangle/ellipse/diamond/text) this is normalised
   * to be non-negative on commit. For line/arrow this is the signed delta of
   * the second endpoint relative to (x, y) and may be negative.
   */
  width: number;
  /** Height (px). Same semantics as `width`. */
  height: number;
  style: Style;
}

export interface Rectangle extends BaseElement {
  readonly type: "rectangle";
}
export interface Ellipse extends BaseElement {
  readonly type: "ellipse";
}
export interface Diamond extends BaseElement {
  readonly type: "diamond";
}
export interface Line extends BaseElement {
  readonly type: "line";
}
export interface Arrow extends BaseElement {
  readonly type: "arrow";
}
export interface TextElement extends BaseElement {
  readonly type: "text";
  text: string;
}

export type SceneElement =
  | Rectangle
  | Ellipse
  | Diamond
  | Line
  | Arrow
  | TextElement;

export const SHAPE_ELEMENT_TYPES: readonly ShapeElementType[] = [
  "rectangle",
  "ellipse",
  "diamond",
  "line",
  "arrow",
] as const;

export const ALL_ELEMENT_TYPES: readonly SceneElementType[] = [
  ...SHAPE_ELEMENT_TYPES,
  "text",
] as const;

// ---------- ID generation (injectable for tests) ----------

let _generateId: () => string = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Tiny non-crypto fallback (only used on extremely old runtimes; tests can
  // override via `setIdGenerator` regardless).
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export function generateId(): string {
  return _generateId();
}

/**
 * Replace the id generator (e.g. with a deterministic counter in tests).
 * Returns a function that restores the previous generator when called.
 */
export function setIdGenerator(fn: () => string): () => void {
  const previous = _generateId;
  _generateId = fn;
  return () => {
    _generateId = previous;
  };
}

// ---------- Constructors ----------

export interface CreateElementOptions {
  id?: string;
}

export interface ShapeInit {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export function createShapeElement(
  type: ShapeElementType,
  init: ShapeInit,
  style: Style,
  options?: CreateElementOptions,
): Rectangle | Ellipse | Diamond | Line | Arrow {
  return {
    id: options?.id ?? generateId(),
    type,
    x: init.x,
    y: init.y,
    width: init.width ?? 0,
    height: init.height ?? 0,
    style: { ...style },
  };
}

export interface TextInit extends ShapeInit {
  text: string;
}

export function createTextElement(
  init: TextInit,
  style: Style,
  options?: CreateElementOptions,
): TextElement {
  return {
    id: options?.id ?? generateId(),
    type: "text",
    x: init.x,
    y: init.y,
    width: init.width ?? 0,
    height: init.height ?? 0,
    text: init.text,
    style: { ...style },
  };
}

// ---------- Update / normalise ----------

export interface ElementPatch {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  style?: Style;
}

/**
 * Apply a patch to an element, returning a new element. The element's
 * `id` and `type` are preserved.
 */
export function updateElement<T extends SceneElement>(
  element: T,
  patch: ElementPatch,
): T {
  const next: T = { ...element };
  if (patch.x !== undefined) next.x = patch.x;
  if (patch.y !== undefined) next.y = patch.y;
  if (patch.width !== undefined) next.width = patch.width;
  if (patch.height !== undefined) next.height = patch.height;
  if (patch.style !== undefined) next.style = { ...patch.style };
  if (patch.text !== undefined && next.type === "text") {
    (next as TextElement).text = patch.text;
  }
  return next;
}

/**
 * Move an element by (dx, dy). Returns a new element.
 */
export function translateElement<T extends SceneElement>(
  element: T,
  dx: number,
  dy: number,
): T {
  return { ...element, x: element.x + dx, y: element.y + dy };
}

/**
 * On commit, shapes (everything except line/arrow) should have non-negative
 * width/height with x/y at the top-left. Line/arrow keep their signed deltas
 * because the endpoint direction matters (arrowhead position).
 */
export function normalizeElement<T extends SceneElement>(element: T): T {
  if (element.type === "line" || element.type === "arrow") {
    return element;
  }
  let { x, y, width, height } = element;
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }
  if (x === element.x && y === element.y) return element;
  return { ...element, x, y, width, height };
}

/** Type guard. */
export function isTextElement(el: SceneElement): el is TextElement {
  return el.type === "text";
}
