import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createShapeElement } from "../domain/elements";
import { DEFAULT_STYLE } from "../domain/style";
import { useSceneStore } from "../state/sceneStore";
import { resetSceneStore } from "../test/storeReset";
import { Toolbar } from "./Toolbar";

describe("Toolbar", () => {
  beforeEach(() => {
    resetSceneStore();
  });

  it("renders a button for each of the 7 tools and a 'New' button", () => {
    render(<Toolbar onNewScene={() => {}} />);
    expect(screen.getByLabelText(/Select \(V\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rectangle \(R\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ellipse \(O\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Diamond \(D\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Line \(L\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Arrow \(A\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Text \(T\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New scene$/)).toBeInTheDocument();
  });

  it("clicking a tool button updates the store's `tool`", async () => {
    const user = userEvent.setup();
    render(<Toolbar onNewScene={() => {}} />);
    await user.click(screen.getByLabelText(/Rectangle \(R\)/));
    expect(useSceneStore.getState().tool).toBe("rectangle");
    await user.click(screen.getByLabelText(/Text \(T\)/));
    expect(useSceneStore.getState().tool).toBe("text");
  });

  it("the current tool's button is aria-pressed=true", () => {
    useSceneStore.setState({ tool: "ellipse" });
    render(<Toolbar onNewScene={() => {}} />);
    const ellipseBtn = screen.getByLabelText(/Ellipse \(O\)/);
    expect(ellipseBtn).toHaveAttribute("aria-pressed", "true");
    const rectBtn = screen.getByLabelText(/Rectangle \(R\)/);
    expect(rectBtn).not.toHaveAttribute("aria-pressed");
  });

  it("clicking 'New scene' invokes the onNewScene prop", async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(<Toolbar onNewScene={onNew} />);
    await user.click(screen.getByLabelText(/^New scene$/));
    expect(onNew).toHaveBeenCalledOnce();
  });

  describe("keyboard shortcuts", () => {
    it("V/R/O/D/L/A/T switch the active tool", () => {
      render(<Toolbar onNewScene={() => {}} />);
      fireEvent.keyDown(window, { key: "r" });
      expect(useSceneStore.getState().tool).toBe("rectangle");
      fireEvent.keyDown(window, { key: "v" });
      expect(useSceneStore.getState().tool).toBe("select");
      fireEvent.keyDown(window, { key: "T" });
      expect(useSceneStore.getState().tool).toBe("text");
    });

    it("Delete removes the current selection (and Esc clears selection)", () => {
      const r = createShapeElement(
        "rectangle",
        { x: 0, y: 0, width: 10, height: 10 },
        DEFAULT_STYLE,
        { id: "x" },
      );
      useSceneStore.getState().addElement(r);
      useSceneStore.getState().setSelection("x");
      render(<Toolbar onNewScene={() => {}} />);

      fireEvent.keyDown(window, { key: "Delete" });
      expect(useSceneStore.getState().elements).toHaveLength(0);
      expect(useSceneStore.getState().selectedId).toBeNull();

      const r2 = createShapeElement(
        "rectangle",
        { x: 0, y: 0, width: 10, height: 10 },
        DEFAULT_STYLE,
        { id: "y" },
      );
      useSceneStore.getState().addElement(r2);
      expect(useSceneStore.getState().selectedId).toBe("y");
      fireEvent.keyDown(window, { key: "Escape" });
      expect(useSceneStore.getState().selectedId).toBeNull();
    });

    it("does not handle shortcuts when typing in an input/textarea", () => {
      render(
        <>
          <input data-testid="probe" />
          <Toolbar onNewScene={() => {}} />
        </>,
      );
      const input = screen.getByTestId("probe");
      input.focus();
      fireEvent.keyDown(input, { key: "r" });
      expect(useSceneStore.getState().tool).toBe("select");
    });

    it("does not trigger when modifier keys are held (preserves browser shortcuts)", () => {
      render(<Toolbar onNewScene={() => {}} />);
      fireEvent.keyDown(window, { key: "r", ctrlKey: true });
      expect(useSceneStore.getState().tool).toBe("select");
      fireEvent.keyDown(window, { key: "r", metaKey: true });
      expect(useSceneStore.getState().tool).toBe("select");
    });
  });
});
