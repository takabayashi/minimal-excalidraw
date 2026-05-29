import { useCallback, useEffect, useState } from "react";
import { useSceneStore } from "../state/sceneStore";
import type { SceneRepository, SceneSummary } from "../persistence/repository";
import { IconButton } from "./components/IconButton";

export interface SessionPanelProps {
  repository: SceneRepository;
}

function formatRelativeTime(updatedAt: number, now: number): string {
  const delta = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  const m = Math.floor(delta / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function SessionPanel({ repository }: SessionPanelProps) {
  const sessionId = useSceneStore((s) => s.sessionId);
  const name = useSceneStore((s) => s.name);
  const elements = useSceneStore((s) => s.elements);
  const setName = useSceneStore((s) => s.setName);
  const loadScene = useSceneStore((s) => s.loadScene);
  const newScene = useSceneStore((s) => s.newScene);

  const [list, setList] = useState<readonly SceneSummary[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await repository.list();
      setList(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [repository]);

  // Refresh on mount and whenever the *current* scene changes. Autosave is
  // debounced, so we also schedule a delayed refresh to pick up the persisted
  // state once the debounce lands.
  useEffect(() => {
    void refresh();
    const handle = setTimeout(() => {
      void refresh();
    }, 500);
    return () => clearTimeout(handle);
  }, [refresh, sessionId, name, elements]);

  // Tick "saved Xs ago" labels.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const onLoad = useCallback(
    async (id: string) => {
      const scene = await repository.load(id);
      if (scene) loadScene(scene);
    },
    [repository, loadScene],
  );

  const onDelete = useCallback(
    async (id: string) => {
      await repository.delete(id);
      if (id === sessionId) newScene();
      await refresh();
    },
    [repository, sessionId, newScene, refresh],
  );

  const currentSummary = list.find((s) => s.id === sessionId);
  const lastSavedLabel = currentSummary
    ? `Saved · ${formatRelativeTime(currentSummary.updatedAt, now)}`
    : "Not yet saved";

  return (
    <aside className="session-panel" aria-label="Sessions">
      <header>
        <span>Session</span>
        <IconButton
          label="New scene"
          data-action="new-scene"
          onClick={() => newScene()}
        >
          New
        </IconButton>
      </header>
      <input
        type="text"
        aria-label="Scene name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <span className="save-status" data-testid="save-status">
        {lastSavedLabel}
      </span>
      {error && (
        <span role="alert" style={{ color: "#e03131", fontSize: 12 }}>
          {error}
        </span>
      )}
      <ul aria-label="Saved scenes">
        {list.map((s) => {
          const isCurrent = s.id === sessionId;
          return (
            <li key={s.id} className={isCurrent ? "is-current" : undefined}>
              <button
                type="button"
                onClick={() => onLoad(s.id)}
                aria-label={`Load ${s.name}`}
                style={{ flex: 1, textAlign: "left", padding: 4 }}
                data-testid="session-load"
                data-id={s.id}
              >
                {s.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${s.name}`}
                onClick={() => onDelete(s.id)}
                data-testid="session-delete"
                data-id={s.id}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
