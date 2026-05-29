import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createShapeElement, createTextElement } from "../domain/elements";
import { DEFAULT_STYLE } from "../domain/style";
import { useSceneStore } from "../state/sceneStore";
import { resetSceneStore } from "../test/storeReset";
import { StylePanel } from "./StylePanel";

describe("StylePanel — visibility", () => {
  beforeEach(() => {
    resetSceneStore();
  });

  it("is hidden when 'select' tool is active and nothing is selected", () => {
    render(<StylePanel />);
    expect(screen.queryByTestId("style-panel")).not.toBeInTheDocument();
  });

  it("is visible when a draw tool is active", () => {
    useSceneStore.getState().setTool("rectangle");
    render(<StylePanel />);
    expect(screen.getByTestId("style-panel")).toBeInTheDocument();
  });

  it("is visible when an element is selected, even with the select tool", () => {
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
      { id: "r1" },
    );
    useSceneStore.getState().addElement(r);
    useSceneStore.getState().setSelection("r1");
    render(<StylePanel />);
    expect(screen.getByTestId("style-panel")).toBeInTheDocument();
  });

  it("shows font controls only when the text tool is active OR a text element is selected", () => {
    useSceneStore.getState().setTool("rectangle");
    const { rerender } = render(<StylePanel />);
    expect(screen.queryByLabelText("Font family")).not.toBeInTheDocument();

    useSceneStore.getState().setTool("text");
    rerender(<StylePanel />);
    expect(screen.getByLabelText("Font family")).toBeInTheDocument();
    expect(screen.getByLabelText("Font size")).toBeInTheDocument();

    useSceneStore.getState().setTool("select");
    const t = createTextElement(
      { x: 0, y: 0, text: "hi" },
      DEFAULT_STYLE,
      { id: "t1" },
    );
    useSceneStore.getState().addElement(t);
    useSceneStore.getState().setSelection("t1");
    rerender(<StylePanel />);
    expect(screen.getByLabelText("Font family")).toBeInTheDocument();
  });
});

describe("StylePanel — interactions", () => {
  beforeEach(() => {
    resetSceneStore();
    useSceneStore.getState().setTool("rectangle");
  });

  it("clicking a stroke colour swatch updates currentStyle.strokeColor", async () => {
    const user = userEvent.setup();
    render(<StylePanel />);
    const strokeGroup = screen.getByRole("radiogroup", { name: /Stroke$/i });
    const reds = strokeGroup.querySelectorAll('[aria-label="red"]');
    expect(reds.length).toBeGreaterThan(0);
    await user.click(reds[0] as Element);
    expect(useSceneStore.getState().currentStyle.strokeColor).toBe("#e03131");
  });

  it("clicking a fill colour swatch updates currentStyle.fillColor", async () => {
    const user = userEvent.setup();
    render(<StylePanel />);
    // Two swatches share the name "red" (stroke + fill); pick fill via its group.
    const fillGroup = screen.getByRole("radiogroup", { name: /Fill/i });
    const reds = fillGroup.querySelectorAll('[aria-label="red"]');
    expect(reds.length).toBeGreaterThan(0);
    await user.click(reds[0] as Element);
    expect(useSceneStore.getState().currentStyle.fillColor).toBe("#e03131");
  });

  it("clicking 'thick' segmented option sets stroke width", async () => {
    const user = userEvent.setup();
    render(<StylePanel />);
    await user.click(screen.getByLabelText(/Thick \(4px\)/));
    expect(useSceneStore.getState().currentStyle.strokeWidth).toBe("thick");
  });

  it("clicking 'dashed' segmented option sets stroke style", async () => {
    const user = userEvent.setup();
    render(<StylePanel />);
    await user.click(screen.getByLabelText("Dashed"));
    expect(useSceneStore.getState().currentStyle.strokeStyle).toBe("dashed");
  });

  it("when an element is selected, style changes propagate to that element", async () => {
    const user = userEvent.setup();
    useSceneStore.getState().setTool("select");
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
      { id: "r1" },
    );
    useSceneStore.getState().addElement(r);
    useSceneStore.getState().setSelection("r1");

    render(<StylePanel />);
    const strokeGroup = screen.getByRole("radiogroup", { name: /Stroke$/i });
    const blues = strokeGroup.querySelectorAll('[aria-label="blue"]');
    await user.click(blues[0] as Element);

    const updated = useSceneStore
      .getState()
      .elements.find((e) => e.id === "r1");
    expect(updated?.style.strokeColor).toBe("#1971c2");
    expect(useSceneStore.getState().currentStyle.strokeColor).toBe("#1971c2");
  });
});
