import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { findElementAt } from "../domain/geometry";
import {
  createShapeElement,
  createTextElement,
  normalizeElement,
} from "../domain/elements";
import type { TextElement } from "../domain/elements";
import { fontFamilyCss, fontSizePx } from "../domain/style";
import { useSceneStore } from "../state/sceneStore";
import { clearCanvas, render } from "../render/renderer";

interface Point {
  x: number;
  y: number;
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elements = useSceneStore((s) => s.elements);
  const selectedId = useSceneStore((s) => s.selectedId);
  const tool = useSceneStore((s) => s.tool);
  const currentStyle = useSceneStore((s) => s.currentStyle);
  const addElement = useSceneStore((s) => s.addElement);
  const updateElement = useSceneStore((s) => s.updateElement);
  const deleteElement = useSceneStore((s) => s.deleteElement);
  const setSelection = useSceneStore((s) => s.setSelection);

  type ActiveDrag =
    | { kind: "draft"; id: string; start: Point }
    | {
        kind: "move";
        id: string;
        pointerStart: Point;
        elementStart: Point;
      };
  const dragRef = useRef<ActiveDrag | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Track host element's size. Use ResizeObserver if available; fall back to
  // window resize. Initial measurement is taken in a layout effect so the
  // first render uses real dimensions.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(canvas);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Render whenever scene or size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w <= 0 || size.h <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr =
      typeof window !== "undefined" && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clearCanvas(ctx, size.w, size.h);
    render(ctx, { elements, selectedId });
  }, [elements, selectedId, size]);

  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.button !== 0) return;
      // Don't steal focus from the text editor overlay.
      if (editingTextId) return;
      const point = toCanvasCoords(event.clientX, event.clientY);

      if (tool === "select") {
        const hit = findElementAt(point, elements);
        if (hit) {
          setSelection(hit.id);
          // Start a move-drag so subsequent pointermove translates the element.
          dragRef.current = {
            kind: "move",
            id: hit.id,
            pointerStart: point,
            elementStart: { x: hit.x, y: hit.y },
          };
          try {
            canvasRef.current?.setPointerCapture(event.pointerId);
          } catch {
            // jsdom does not implement setPointerCapture; ignore.
          }
        } else {
          setSelection(null);
        }
        return;
      }

      if (tool === "text") {
        // Prevent the browser's native focus-clearing on a pointerdown
        // targeting a non-focusable element (the canvas). Without this, the
        // about-to-mount textarea is focused via useEffect but focus is then
        // cleared by the still-pending native default action, firing an
        // immediate `onBlur` that destroys the empty text element.
        event.preventDefault();
        const t = createTextElement(
          { x: point.x, y: point.y, text: "" },
          currentStyle,
        );
        addElement(t);
        setEditingTextId(t.id);
        return;
      }

      const el = createShapeElement(
        tool,
        { x: point.x, y: point.y, width: 0, height: 0 },
        currentStyle,
      );
      addElement(el);
      dragRef.current = { kind: "draft", id: el.id, start: point };
      try {
        canvasRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // jsdom does not implement setPointerCapture; ignore.
      }
    },
    [
      addElement,
      currentStyle,
      editingTextId,
      elements,
      setSelection,
      toCanvasCoords,
      tool,
    ],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = toCanvasCoords(event.clientX, event.clientY);
      if (drag.kind === "draft") {
        updateElement(drag.id, {
          width: p.x - drag.start.x,
          height: p.y - drag.start.y,
        });
      } else {
        updateElement(drag.id, {
          x: drag.elementStart.x + (p.x - drag.pointerStart.x),
          y: drag.elementStart.y + (p.y - drag.pointerStart.y),
        });
      }
    },
    [toCanvasCoords, updateElement],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      try {
        canvasRef.current?.releasePointerCapture(event.pointerId);
      } catch {
        // jsdom does not implement releasePointerCapture; ignore.
      }
      dragRef.current = null;

      if (drag.kind === "move") {
        // Move drags don't need normalisation; the translation already
        // produced final x/y. Selection stays where it was.
        return;
      }

      const { id } = drag;
      const current = useSceneStore
        .getState()
        .elements.find((e) => e.id === id);
      if (!current) return;
      if (current.width === 0 && current.height === 0) {
        deleteElement(id);
        return;
      }
      const normalized = normalizeElement(current);
      if (normalized !== current) {
        updateElement(id, {
          x: normalized.x,
          y: normalized.y,
          width: normalized.width,
          height: normalized.height,
        });
      }
      setSelection(id);
    },
    [deleteElement, setSelection, updateElement],
  );

  const editingText = editingTextId
    ? elements.find((e) => e.id === editingTextId)
    : undefined;

  return (
    <div className="canvas-host">
      <canvas
        ref={canvasRef}
        aria-label="Drawing canvas"
        role="img"
        data-testid="canvas"
        data-tool={tool}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {editingText && editingText.type === "text" && (
        <TextEditor
          key={editingText.id}
          element={editingText}
          onCommit={(text, width, height) => {
            if (text.length === 0) {
              deleteElement(editingText.id);
            } else {
              updateElement(editingText.id, { text, width, height });
              setSelection(editingText.id);
            }
            setEditingTextId(null);
          }}
        />
      )}
    </div>
  );
}

interface TextEditorProps {
  element: TextElement;
  onCommit(text: string, width: number, height: number): void;
}

function TextEditor({ element, onCommit }: TextEditorProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(element.text);
  const sizePx = fontSizePx(element.style.fontSize);
  const fontFamily = fontFamilyCss(element.style.fontFamily);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const autoSize = useCallback(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.width = "0px";
    ta.style.height = "0px";
    ta.style.width = `${ta.scrollWidth + 2}px`;
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }, []);

  useLayoutEffect(() => {
    autoSize();
  }, [text, autoSize]);

  const finalize = useCallback(() => {
    const ta = ref.current;
    if (!ta) return onCommit(text, 0, 0);
    onCommit(text, ta.scrollWidth + 2, ta.scrollHeight + 2);
  }, [onCommit, text]);

  return (
    <textarea
      ref={ref}
      value={text}
      data-testid="text-editor"
      onChange={(e) => setText(e.currentTarget.value)}
      onBlur={finalize}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          finalize();
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finalize();
        }
      }}
      className="text-overlay"
      style={{
        left: element.x,
        top: element.y,
        font: `${sizePx}px ${fontFamily}`,
        color: element.style.strokeColor,
        minWidth: 50,
        minHeight: sizePx + 4,
        lineHeight: `${sizePx}px`,
      }}
    />
  );
}
