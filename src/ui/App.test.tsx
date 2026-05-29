import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeAutosave } from "../persistence/autosave";
import { InMemoryRepository } from "../persistence/inMemoryRepository";
import { useSceneStore } from "../state/sceneStore";
import { resetSceneStore } from "../test/storeReset";
import { App } from "./App";

describe("App — integration", () => {
  beforeEach(() => {
    resetSceneStore();
    vi.useRealTimers();
  });

  it("renders Toolbar, StylePanel-when-relevant, SessionPanel and Canvas", async () => {
    const repo = new InMemoryRepository();
    render(<App repository={repo} />);
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByLabelText(/Rectangle \(R\)/)).toBeInTheDocument();
    expect(screen.getByLabelText("Scene name")).toBeInTheDocument();
    // StylePanel is hidden when select tool & no selection.
    expect(screen.queryByTestId("style-panel")).not.toBeInTheDocument();
  });

  it("end-to-end: pick rectangle tool, draw, then change colour via StylePanel", async () => {
    const user = userEvent.setup();
    const repo = new InMemoryRepository();
    render(<App repository={repo} />);

    await user.click(screen.getByLabelText(/Rectangle \(R\)/));
    expect(useSceneStore.getState().tool).toBe("rectangle");

    const canvas = screen.getByTestId("canvas") as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, {
      clientX: 0,
      clientY: 0,
      button: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 100,
      clientY: 80,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 100,
      clientY: 80,
      pointerId: 1,
    });

    expect(useSceneStore.getState().elements).toHaveLength(1);

    // After drawing, switch back to select to show the style panel for the
    // selected element, then change its stroke colour.
    await user.click(screen.getByLabelText(/Select \(V\)/));
    // Drawing already left the new element selected; selection survives the
    // tool switch.
    const selectedId = useSceneStore.getState().selectedId;
    expect(selectedId).not.toBeNull();
    expect(screen.getByTestId("style-panel")).toBeInTheDocument();

    const fillGroup = screen.getByRole("radiogroup", { name: /Stroke$/i });
    const blueSwatch = fillGroup.querySelector('[aria-label="blue"]');
    expect(blueSwatch).not.toBeNull();
    await user.click(blueSwatch as Element);

    const updated = useSceneStore
      .getState()
      .elements.find((e) => e.id === selectedId);
    expect(updated?.style.strokeColor).toBe("#1971c2");
  });

  it("end-to-end with autosave: drawing persists and the saved scene appears in the panel", async () => {
    const user = userEvent.setup();
    const repo = new InMemoryRepository();
    const unsubscribe = subscribeAutosave(useSceneStore, repo, {
      debounceMs: 10,
    });
    try {
      render(<App repository={repo} />);
      await user.click(screen.getByLabelText(/Rectangle \(R\)/));

      const canvas = screen.getByTestId("canvas") as HTMLCanvasElement;
      fireEvent.pointerDown(canvas, {
        clientX: 0,
        clientY: 0,
        button: 0,
        pointerId: 1,
      });
      fireEvent.pointerMove(canvas, {
        clientX: 100,
        clientY: 80,
        pointerId: 1,
      });
      fireEvent.pointerUp(canvas, {
        clientX: 100,
        clientY: 80,
        pointerId: 1,
      });

      const sessionId = useSceneStore.getState().sessionId;

      await waitFor(async () => {
        const scene = await repo.load(sessionId);
        expect(scene).not.toBeNull();
        expect(scene?.elements).toHaveLength(1);
      });

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Load Untitled scene/),
        ).toBeInTheDocument();
      });
    } finally {
      unsubscribe();
    }
  });
});
