import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildCategoryTree, useExamCategories } from "../../api/categories";
import type { CategoryNode } from "../../api/categories";
import { useMyTracks } from "../../api/me";
import { activeTrackStore } from "./activeTrackStore";

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

type TrackCtx = {
  tracks: CategoryNode[];
  activeTrackId: string | null;
  setActiveTrackId: (id: string) => void;
  collections: CategoryNode[];
  isLoading: boolean;
};

const TrackContext = createContext<TrackCtx | null>(null);

export function TrackProvider({ children }: { children: React.ReactNode }) {
  const categories = useExamCategories();
  const myTracks = useMyTracks();
  const [activeId, setActiveId] = useState<string | null>(() => activeTrackStore.get());

  // Subscribed track nodes = tree flattened, kept to kind==="track" the user picked.
  const tracks = useMemo(() => {
    const ids = new Set(myTracks.data?.trackIds ?? []);
    return flatten(buildCategoryTree(categories.data ?? [])).filter(
      (n) => n.kind === "track" && ids.has(n.id));
  }, [categories.data, myTracks.data]);

  // Stored id wins while still subscribed; otherwise fall back to the first track.
  const activeTrackId = useMemo(() => {
    if (tracks.length === 0) return null;
    if (activeId && tracks.some((t) => t.id === activeId)) return activeId;
    return tracks[0].id;
  }, [tracks, activeId]);

  // Persist the resolved id (incl. the fallback when a stored id is stale) so
  // the next load starts from a valid subscribed track.
  useEffect(() => {
    if (activeTrackId) activeTrackStore.set(activeTrackId);
  }, [activeTrackId]);

  const setActiveTrackId = useCallback((id: string) => {
    activeTrackStore.set(id);
    setActiveId(id);
  }, []);

  const collections = useMemo(() => {
    const active = tracks.find((t) => t.id === activeTrackId);
    return (active?.children ?? []).filter((c) => c.kind === "collection");
  }, [tracks, activeTrackId]);

  const value = useMemo<TrackCtx>(
    () => ({
      tracks,
      activeTrackId,
      setActiveTrackId,
      collections,
      isLoading: categories.isLoading || myTracks.isLoading,
    }),
    [tracks, activeTrackId, setActiveTrackId, collections, categories.isLoading, myTracks.isLoading],
  );

  return <TrackContext.Provider value={value}>{children}</TrackContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- house pattern (see theme/ThemeContext.tsx)
export function useActiveTrack(): TrackCtx {
  const ctx = useContext(TrackContext);
  if (!ctx) throw new Error("useActiveTrack outside TrackProvider");
  return ctx;
}
