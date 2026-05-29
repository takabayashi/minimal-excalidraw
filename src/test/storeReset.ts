import { DEFAULT_STYLE } from "../domain/style";
import { generateId } from "../domain/elements";
import { useSceneStore } from "../state/sceneStore";

/**
 * Resets the singleton scene store back to a fresh blank state.
 * Use in `beforeEach` for component tests so they don't leak state.
 */
export function resetSceneStore(): void {
  useSceneStore.setState({
    sessionId: generateId(),
    name: "Untitled scene",
    elements: [],
    selectedId: null,
    tool: "select",
    currentStyle: { ...DEFAULT_STYLE },
  });
}
