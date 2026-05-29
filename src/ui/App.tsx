import { useCallback } from "react";
import type { SceneRepository } from "../persistence/repository";
import { useSceneStore } from "../state/sceneStore";
import { Canvas } from "./Canvas";
import { SessionPanel } from "./SessionPanel";
import { StylePanel } from "./StylePanel";
import { Toolbar } from "./Toolbar";

export interface AppProps {
  repository: SceneRepository;
}

export function App({ repository }: AppProps) {
  const newScene = useSceneStore((s) => s.newScene);

  const onNewScene = useCallback(() => {
    newScene();
  }, [newScene]);

  return (
    <div className="app" data-testid="app">
      <Canvas />
      <Toolbar onNewScene={onNewScene} />
      <SessionPanel repository={repository} />
      <StylePanel />
    </div>
  );
}
