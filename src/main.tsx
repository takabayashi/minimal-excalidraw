import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { LocalStorageRepository } from "./persistence/localStorageRepository";
import { subscribeAutosave } from "./persistence/autosave";
import { useSceneStore } from "./state/sceneStore";
import "./index.css";

const repository = new LocalStorageRepository();

subscribeAutosave(useSceneStore, repository);

// Best-effort: restore the most recently saved scene on boot so closing the
// tab and reopening it picks up where the user left off.
void (async () => {
  try {
    const list = await repository.list();
    const top = list[0];
    if (!top) return;
    const scene = await repository.load(top.id);
    if (scene) useSceneStore.getState().loadScene(scene);
  } catch (err) {
    console.error("[boot] failed to restore last scene", err);
  }
})();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element in index.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <App repository={repository} />
  </StrictMode>,
);
