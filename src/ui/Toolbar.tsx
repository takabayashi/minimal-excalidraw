import { useEffect } from "react";
import { useSceneStore } from "../state/sceneStore";
import type { Tool } from "../state/sceneStore";
import { IconButton } from "./components/IconButton";

interface ToolEntry {
  tool: Tool;
  label: string;
  shortcut: string;
  glyph: string;
}

const TOOL_ENTRIES: readonly ToolEntry[] = [
  { tool: "select", label: "Select", shortcut: "V", glyph: "↖" },
  { tool: "rectangle", label: "Rectangle", shortcut: "R", glyph: "□" },
  { tool: "ellipse", label: "Ellipse", shortcut: "O", glyph: "○" },
  { tool: "diamond", label: "Diamond", shortcut: "D", glyph: "◇" },
  { tool: "line", label: "Line", shortcut: "L", glyph: "—" },
  { tool: "arrow", label: "Arrow", shortcut: "A", glyph: "→" },
  { tool: "text", label: "Text", shortcut: "T", glyph: "T" },
];

const SHORTCUTS: Readonly<Record<string, Tool>> = {
  v: "select",
  r: "rectangle",
  o: "ellipse",
  d: "diamond",
  l: "line",
  a: "arrow",
  t: "text",
};

export interface ToolbarProps {
  onNewScene(): void;
}

export function Toolbar({ onNewScene }: ToolbarProps) {
  const tool = useSceneStore((s) => s.tool);
  const setTool = useSceneStore((s) => s.setTool);
  const deleteSelected = useSceneStore((s) => s.deleteSelected);
  const setSelection = useSceneStore((s) => s.setSelection);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      // Read selection at the moment the key fires, not at effect-bind time,
      // so we don't miss events that arrive before the next React render.
      const currentSelectedId = useSceneStore.getState().selectedId;
      if (key === "delete" || key === "backspace") {
        if (currentSelectedId) {
          event.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (key === "escape") {
        if (currentSelectedId) setSelection(null);
        return;
      }
      const candidate = SHORTCUTS[key];
      if (candidate) {
        event.preventDefault();
        setTool(candidate);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setTool, deleteSelected, setSelection]);

  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing tools">
      <div role="radiogroup" aria-label="Tool" style={{ display: "flex", gap: 4 }}>
        {TOOL_ENTRIES.map((entry) => (
          <IconButton
            key={entry.tool}
            label={`${entry.label} (${entry.shortcut})`}
            active={tool === entry.tool}
            data-tool={entry.tool}
            onClick={() => setTool(entry.tool)}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>
              {entry.glyph}
            </span>
          </IconButton>
        ))}
      </div>
      <div className="divider" aria-hidden="true" />
      <IconButton label="New scene" onClick={onNewScene} data-action="new">
        New
      </IconButton>
    </div>
  );
}
