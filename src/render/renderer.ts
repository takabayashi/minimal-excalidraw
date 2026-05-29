import type {
  Arrow,
  Line,
  SceneElement,
  TextElement,
} from "../domain/elements";
import type { Style } from "../domain/style";
import {
  fontFamilyCss,
  fontSizePx,
  opacityFraction,
  strokeDashArray,
  strokeWidthPx,
  TRANSPARENT,
} from "../domain/style";
import { getBoundingBox, type BoundingBox } from "../domain/geometry";

export interface RenderableScene {
  elements: readonly SceneElement[];
  selectedId: string | null;
}

const ARROW_HEAD_LENGTH = 12;
const ARROW_HEAD_ANGLE = Math.PI / 7;
const SELECTION_PADDING = 4;
const SELECTION_DASH: readonly number[] = [4, 4];
const SELECTION_COLOR = "#1971c2";

/**
 * Pure render function. Iterates `elements` in order (later draws on top),
 * then draws a dashed selection outline around `selectedId` if present.
 *
 * Caller is responsible for clearing the canvas and applying any
 * device-pixel-ratio transform before calling this function.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  scene: RenderableScene,
): void {
  for (const el of scene.elements) {
    ctx.save();
    drawElement(ctx, el);
    ctx.restore();
  }
  if (scene.selectedId) {
    const selected = scene.elements.find((e) => e.id === scene.selectedId);
    if (selected) {
      ctx.save();
      drawSelectionOutline(ctx, selected);
      ctx.restore();
    }
  }
}

/** Clears `ctx`'s entire drawing surface. Helper for callers. */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
}

// ---------- internals -------------------------------------------------------

function applyStyle(ctx: CanvasRenderingContext2D, style: Style): void {
  ctx.globalAlpha = opacityFraction(style.opacity);
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = strokeWidthPx(style.strokeWidth);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([...strokeDashArray(style.strokeStyle)]);
}

function fillIfNeeded(ctx: CanvasRenderingContext2D, style: Style): void {
  if (style.fillColor !== TRANSPARENT) {
    ctx.fillStyle = style.fillColor;
    ctx.fill();
  }
}

function drawElement(ctx: CanvasRenderingContext2D, el: SceneElement): void {
  applyStyle(ctx, el.style);
  switch (el.type) {
    case "rectangle":
      drawRectangle(ctx, getBoundingBox(el), el.style);
      return;
    case "ellipse":
      drawEllipse(ctx, getBoundingBox(el), el.style);
      return;
    case "diamond":
      drawDiamond(ctx, getBoundingBox(el), el.style);
      return;
    case "line":
      drawLine(ctx, el);
      return;
    case "arrow":
      drawArrow(ctx, el);
      return;
    case "text":
      drawText(ctx, el);
      return;
  }
}

function drawRectangle(
  ctx: CanvasRenderingContext2D,
  bbox: BoundingBox,
  style: Style,
): void {
  ctx.beginPath();
  ctx.rect(bbox.x, bbox.y, bbox.width, bbox.height);
  fillIfNeeded(ctx, style);
  ctx.stroke();
}

function drawEllipse(
  ctx: CanvasRenderingContext2D,
  bbox: BoundingBox,
  style: Style,
): void {
  const rx = bbox.width / 2;
  const ry = bbox.height / 2;
  const cx = bbox.x + rx;
  const cy = bbox.y + ry;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(rx, 0), Math.max(ry, 0), 0, 0, Math.PI * 2);
  fillIfNeeded(ctx, style);
  ctx.stroke();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  bbox: BoundingBox,
  style: Style,
): void {
  const cx = bbox.x + bbox.width / 2;
  const top = bbox.y;
  const right = bbox.x + bbox.width;
  const bottom = bbox.y + bbox.height;
  const left = bbox.x;
  const cy = bbox.y + bbox.height / 2;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(right, cy);
  ctx.lineTo(cx, bottom);
  ctx.lineTo(left, cy);
  ctx.closePath();
  fillIfNeeded(ctx, style);
  ctx.stroke();
}

function drawLine(ctx: CanvasRenderingContext2D, line: Line): void {
  ctx.beginPath();
  ctx.moveTo(line.x, line.y);
  ctx.lineTo(line.x + line.width, line.y + line.height);
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, arrow: Arrow): void {
  const x1 = arrow.x;
  const y1 = arrow.y;
  const x2 = arrow.x + arrow.width;
  const y2 = arrow.y + arrow.height;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Arrowhead at the tip (x2, y2). Skip if the line has zero length.
  if (arrow.width === 0 && arrow.height === 0) return;
  const angle = Math.atan2(arrow.height, arrow.width);
  const headX1 = x2 - ARROW_HEAD_LENGTH * Math.cos(angle - ARROW_HEAD_ANGLE);
  const headY1 = y2 - ARROW_HEAD_LENGTH * Math.sin(angle - ARROW_HEAD_ANGLE);
  const headX2 = x2 - ARROW_HEAD_LENGTH * Math.cos(angle + ARROW_HEAD_ANGLE);
  const headY2 = y2 - ARROW_HEAD_LENGTH * Math.sin(angle + ARROW_HEAD_ANGLE);
  ctx.beginPath();
  ctx.moveTo(headX1, headY1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(headX2, headY2);
  ctx.stroke();
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement): void {
  // Text uses solid rendering regardless of stroke style.
  ctx.setLineDash([]);
  const sizePx = fontSizePx(el.style.fontSize);
  ctx.font = `${sizePx}px ${fontFamilyCss(el.style.fontFamily)}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = el.style.strokeColor;
  // Render each line separately so multi-line text just works.
  const lines = el.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    ctx.fillText(line, el.x, el.y + i * sizePx);
  }
}

function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  el: SceneElement,
): void {
  const bbox = getBoundingBox(el);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([...SELECTION_DASH]);
  ctx.strokeRect(
    bbox.x - SELECTION_PADDING,
    bbox.y - SELECTION_PADDING,
    bbox.width + SELECTION_PADDING * 2,
    bbox.height + SELECTION_PADDING * 2,
  );
}
