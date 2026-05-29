import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createShapeElement } from "../domain/elements";
import { DEFAULT_STYLE } from "../domain/style";
import { useSceneStore } from "../state/sceneStore";
import { resetSceneStore } from "../test/storeReset";
import { Canvas } from "./Canvas";

function getCanvas(): HTMLCanvasElement {
  return screen.getByTestId("canvas") as HTMLCanvasElement;
}

function pointerDrag(
  canvas: HTMLCanvasElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  fireEvent.pointerDown(canvas, {
    clientX: from.x,
    clientY: from.y,
    button: 0,
    pointerId: 1,
  });
  fireEvent.pointerMove(canvas, {
    clientX: to.x,
    clientY: to.y,
    pointerId: 1,
  });
  fireEvent.pointerUp(canvas, {
    clientX: to.x,
    clientY: to.y,
    pointerId: 1,
  });
}

describe("Canvas — drawing", () => {
  beforeEach(() => {
    resetSceneStore();
  });

  it.each([
    ["rectangle"],
    ["ellipse"],
    ["diamond"],
    ["line"],
    ["arrow"],
  ] as const)("creates a %s on pointer down/move/up with the active tool", (tool) => {
    useSceneStore.getState().setTool(tool);
    render(<Canvas />);
    pointerDrag(getCanvas(), { x: 50, y: 60 }, { x: 200, y: 180 });
    const elements = useSceneStore.getState().elements;
    expect(elements).toHaveLength(1);
    expect(elements[0]?.type).toBe(tool);
    // Final state for shapes is normalised; for line/arrow the signed deltas
    // are preserved (direction matters).
    if (tool === "line" || tool === "arrow") {
      expect(elements[0]?.x).toBe(50);
      expect(elements[0]?.y).toBe(60);
      expect(elements[0]?.width).toBe(150);
      expect(elements[0]?.height).toBe(120);
    } else {
      expect(elements[0]?.x).toBe(50);
      expect(elements[0]?.y).toBe(60);
      expect(elements[0]?.width).toBe(150);
      expect(elements[0]?.height).toBe(120);
    }
    // Newly created element is selected.
    expect(useSceneStore.getState().selectedId).toBe(elements[0]?.id);
  });

  it("normalises a shape drawn up-and-to-the-left", () => {
    useSceneStore.getState().setTool("rectangle");
    render(<Canvas />);
    pointerDrag(getCanvas(), { x: 200, y: 180 }, { x: 50, y: 60 });
    const r = useSceneStore.getState().elements[0];
    expect(r?.x).toBe(50);
    expect(r?.y).toBe(60);
    expect(r?.width).toBe(150);
    expect(r?.height).toBe(120);
  });

  it("preserves negative deltas for line/arrow (direction matters)", () => {
    useSceneStore.getState().setTool("arrow");
    render(<Canvas />);
    pointerDrag(getCanvas(), { x: 200, y: 200 }, { x: 100, y: 100 });
    const a = useSceneStore.getState().elements[0];
    expect(a?.x).toBe(200);
    expect(a?.y).toBe(200);
    expect(a?.width).toBe(-100);
    expect(a?.height).toBe(-100);
  });

  it("discards a 0x0 shape (single click without drag)", () => {
    useSceneStore.getState().setTool("rectangle");
    render(<Canvas />);
    fireEvent.pointerDown(getCanvas(), {
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerId: 1,
    });
    fireEvent.pointerUp(getCanvas(), {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    expect(useSceneStore.getState().elements).toHaveLength(0);
  });

  it("uses the current style for the new element", () => {
    useSceneStore.getState().setTool("rectangle");
    useSceneStore.getState().setStyle({ strokeColor: "#1971c2" });
    render(<Canvas />);
    pointerDrag(getCanvas(), { x: 0, y: 0 }, { x: 10, y: 10 });
    const r = useSceneStore.getState().elements[0];
    expect(r?.style.strokeColor).toBe("#1971c2");
  });

  it("ignores right-click (button !== 0)", () => {
    useSceneStore.getState().setTool("rectangle");
    render(<Canvas />);
    fireEvent.pointerDown(getCanvas(), {
      clientX: 0,
      clientY: 0,
      button: 2,
      pointerId: 1,
    });
    fireEvent.pointerUp(getCanvas(), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    expect(useSceneStore.getState().elements).toHaveLength(0);
  });
});

describe("Canvas — selection", () => {
  beforeEach(() => {
    resetSceneStore();
    const r = createShapeElement(
      "rectangle",
      { x: 100, y: 100, width: 100, height: 100 },
      DEFAULT_STYLE,
      { id: "r1" },
    );
    useSceneStore.getState().addElement(r);
    useSceneStore.getState().setSelection(null);
  });

  it("clicking inside an existing element with the select tool selects it", () => {
    useSceneStore.getState().setTool("select");
    render(<Canvas />);
    fireEvent.pointerDown(getCanvas(), {
      clientX: 150,
      clientY: 150,
      button: 0,
      pointerId: 1,
    });
    fireEvent.pointerUp(getCanvas(), {
      clientX: 150,
      clientY: 150,
      pointerId: 1,
    });
    expect(useSceneStore.getState().selectedId).toBe("r1");
  });

  it("clicking outside any element clears the selection", () => {
    useSceneStore.getState().setTool("select");
    useSceneStore.getState().setSelection("r1");
    render(<Canvas />);
    fireEvent.pointerDown(getCanvas(), {
      clientX: 500,
      clientY: 500,
      button: 0,
      pointerId: 1,
    });
    fireEvent.pointerUp(getCanvas(), {
      clientX: 500,
      clientY: 500,
      pointerId: 1,
    });
    expect(useSceneStore.getState().selectedId).toBeNull();
  });

  it("dragging a selected element with the select tool translates it (regression)", () => {
    useSceneStore.getState().setTool("select");
    render(<Canvas />);
    // Press inside the element at (150, 150). Element is at (100, 100, 100x100).
    pointerDrag(getCanvas(), { x: 150, y: 150 }, { x: 230, y: 180 });
    const moved = useSceneStore.getState().elements[0];
    // Element top-left should have shifted by the pointer delta (+80, +30).
    expect(moved?.x).toBe(180);
    expect(moved?.y).toBe(130);
    // Width/height are unchanged.
    expect(moved?.width).toBe(100);
    expect(moved?.height).toBe(100);
    // Element remains selected after the drag.
    expect(useSceneStore.getState().selectedId).toBe("r1");
  });

  it("a click without movement on an element selects it but doesn't translate it", () => {
    useSceneStore.getState().setTool("select");
    render(<Canvas />);
    fireEvent.pointerDown(getCanvas(), {
      clientX: 150,
      clientY: 150,
      button: 0,
      pointerId: 1,
    });
    fireEvent.pointerUp(getCanvas(), {
      clientX: 150,
      clientY: 150,
      pointerId: 1,
    });
    const r = useSceneStore.getState().elements[0];
    expect(r?.x).toBe(100);
    expect(r?.y).toBe(100);
    expect(useSceneStore.getState().selectedId).toBe("r1");
  });
});

describe("Canvas — text editing", () => {
  beforeEach(() => {
    resetSceneStore();
  });

  it("clicking with the text tool spawns a text editor and creates a placeholder element", () => {
    useSceneStore.getState().setTool("text");
    render(<Canvas />);
    fireEvent.pointerDown(getCanvas(), {
      clientX: 50,
      clientY: 70,
      button: 0,
      pointerId: 1,
    });
    expect(useSceneStore.getState().elements).toHaveLength(1);
    expect(useSceneStore.getState().elements[0]?.type).toBe("text");
    expect(screen.getByTestId("text-editor")).toBeInTheDocument();
  });

  it("typing then blurring commits the text and removes the editor", async () => {
    const user = userEvent.setup();
    useSceneStore.getState().setTool("text");
    render(<Canvas />);
    fireEvent.pointerDown(getCanvas(), {
      clientX: 50,
      clientY: 70,
      button: 0,
      pointerId: 1,
    });
    const editor = screen.getByTestId("text-editor");
    await user.type(editor, "hello");
    fireEvent.blur(editor);
    const t = useSceneStore.getState().elements[0];
    expect(t?.type).toBe("text");
    if (t?.type === "text") {
      expect(t.text).toBe("hello");
    }
    expect(screen.queryByTestId("text-editor")).not.toBeInTheDocument();
  });

  it("blurring with empty text discards the placeholder element", () => {
    useSceneStore.getState().setTool("text");
    render(<Canvas />);
    fireEvent.pointerDown(getCanvas(), {
      clientX: 50,
      clientY: 70,
      button: 0,
      pointerId: 1,
    });
    const editor = screen.getByTestId("text-editor");
    fireEvent.blur(editor);
    expect(useSceneStore.getState().elements).toHaveLength(0);
  });

  it("calls preventDefault on the text-tool pointerdown so the browser does not steal focus from the editor (regression)", () => {
    useSceneStore.getState().setTool("text");
    render(<Canvas />);
    const canvas = getCanvas();
    // Build the event so we can inspect `defaultPrevented` after fireEvent.
    const event = createEvent.pointerDown(canvas, {
      clientX: 50,
      clientY: 70,
      button: 0,
      pointerId: 1,
    });
    fireEvent(canvas, event);
    // The handler must call preventDefault() — without that, the browser's
    // native focus management blurs the about-to-mount textarea, which fires
    // onBlur immediately and discards the empty placeholder element.
    expect(event.defaultPrevented).toBe(true);
    // And the placeholder text element exists + editor is open.
    expect(useSceneStore.getState().elements).toHaveLength(1);
    expect(screen.getByTestId("text-editor")).toBeInTheDocument();
  });
});
