import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createShapeElement } from "../domain/elements";
import { DEFAULT_STYLE } from "../domain/style";
import { InMemoryRepository } from "../persistence/inMemoryRepository";
import { SCENE_SCHEMA_VERSION } from "../persistence/repository";
import type { Scene } from "../persistence/repository";
import { useSceneStore } from "../state/sceneStore";
import { resetSceneStore } from "../test/storeReset";
import { SessionPanel } from "./SessionPanel";

function makeScene(id: string, name: string, updatedAt: number): Scene {
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    id,
    name,
    updatedAt,
    elements: [
      createShapeElement(
        "rectangle",
        { x: 0, y: 0, width: 10, height: 10 },
        DEFAULT_STYLE,
        { id: `${id}-r1` },
      ),
    ],
  };
}

describe("SessionPanel", () => {
  beforeEach(() => {
    resetSceneStore();
  });

  it("renders the saved scenes from the repository", async () => {
    const repo = new InMemoryRepository();
    await repo.save(makeScene("a", "First", 100));
    await repo.save(makeScene("b", "Second", 200));
    render(<SessionPanel repository={repo} />);
    await waitFor(() => {
      expect(screen.getByLabelText("Load First")).toBeInTheDocument();
      expect(screen.getByLabelText("Load Second")).toBeInTheDocument();
    });
  });

  it("clicking a scene's name button loads it into the store", async () => {
    const repo = new InMemoryRepository();
    await repo.save(makeScene("a", "First", 100));
    const user = userEvent.setup();
    render(<SessionPanel repository={repo} />);
    await waitFor(() =>
      expect(screen.getByLabelText("Load First")).toBeInTheDocument(),
    );
    await user.click(screen.getByLabelText("Load First"));
    await waitFor(() => {
      expect(useSceneStore.getState().sessionId).toBe("a");
      expect(useSceneStore.getState().name).toBe("First");
      expect(useSceneStore.getState().elements).toHaveLength(1);
    });
  });

  it("clicking the delete button removes the scene from the repository", async () => {
    const repo = new InMemoryRepository();
    await repo.save(makeScene("a", "First", 1));
    const user = userEvent.setup();
    render(<SessionPanel repository={repo} />);
    await waitFor(() =>
      expect(screen.getByLabelText("Delete First")).toBeInTheDocument(),
    );
    await user.click(screen.getByLabelText("Delete First"));
    await waitFor(async () => {
      expect(await repo.load("a")).toBeNull();
    });
  });

  it("editing the scene name updates the store", async () => {
    const repo = new InMemoryRepository();
    const user = userEvent.setup();
    render(<SessionPanel repository={repo} />);
    const input = screen.getByLabelText("Scene name") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "My drawing");
    expect(useSceneStore.getState().name).toBe("My drawing");
  });

  it("clicking 'New' resets the store via newScene()", async () => {
    const repo = new InMemoryRepository();
    const user = userEvent.setup();
    const r = createShapeElement(
      "rectangle",
      { x: 0, y: 0, width: 10, height: 10 },
      DEFAULT_STYLE,
      { id: "r1" },
    );
    useSceneStore.getState().addElement(r);
    render(<SessionPanel repository={repo} />);
    await user.click(screen.getByLabelText("New scene"));
    expect(useSceneStore.getState().elements).toHaveLength(0);
  });
});
