"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GlossaryEntry, ProfileId } from "./prompts";

/**
 * Everything the demo remembers lives in localStorage, mirroring the macOS
 * app's privacy stance: transcripts stay on the device that made them. Nothing
 * here is ever sent to a server except the audio you explicitly transcribe.
 */

export interface HistoryItem {
  id: string;
  /** Epoch ms. */
  at: number;
  /** Raw speech-to-text output, before cleanup. */
  raw: string;
  /** Final text after LLM cleanup (equals `raw` when cleanup was off). */
  text: string;
  profile: ProfileId;
  /** Length of the source audio, seconds. */
  audioSeconds: number;
  /** Wall-clock time the pipeline took, ms. */
  elapsedMs: number;
  source: "mic" | "upload";
}

export interface Settings {
  profile: ProfileId;
  cleanup: boolean;
  saveHistory: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  profile: "casual",
  cleanup: true,
  saveHistory: true,
};

/** Stable empty values — returning a fresh array would re-render on every read. */
const EMPTY_HISTORY: HistoryItem[] = [];
const EMPTY_GLOSSARY: GlossaryEntry[] = [];

/** Caps the log so a long demo session can't blow the ~5 MB localStorage budget. */
const HISTORY_LIMIT = 200;

interface WisprState {
  settings: Settings;
  glossary: GlossaryEntry[];
  history: HistoryItem[];
  updateSettings: (patch: Partial<Settings>) => void;
  setGlossary: (entries: GlossaryEntry[]) => void;
  addHistory: (item: HistoryItem) => void;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
}

export const useWisprStore = create<WisprState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      glossary: EMPTY_GLOSSARY,
      history: EMPTY_HISTORY,

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      setGlossary: (glossary) => set({ glossary }),

      addHistory: (item) =>
        set((s) => ({ history: [item, ...s.history].slice(0, HISTORY_LIMIT) })),

      deleteHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),

      clearHistory: () => set({ history: EMPTY_HISTORY }),
    }),
    {
      name: "wisprfree.v1",
      storage: createJSONStorage(() => localStorage),
      // Actions don't belong in localStorage.
      partialize: (s) => ({
        settings: s.settings,
        glossary: s.glossary,
        history: s.history,
      }),
    },
  ),
);

/**
 * False during SSR and the hydration render, true once persisted state has
 * been read back. Every hook below gates on it, so the first client render
 * matches the server HTML exactly and React never reports a mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useWisprStore.persist.onFinishHydration(onChange),
    () => useWisprStore.persist.hasHydrated(),
    () => false,
  );
}

export function useSettings(): Settings {
  const hydrated = useHydrated();
  const settings = useWisprStore((s) => s.settings);
  return hydrated ? settings : DEFAULT_SETTINGS;
}

export function useGlossary(): GlossaryEntry[] {
  const hydrated = useHydrated();
  const glossary = useWisprStore((s) => s.glossary);
  return hydrated ? glossary : EMPTY_GLOSSARY;
}

export function useHistory(): HistoryItem[] {
  const hydrated = useHydrated();
  const history = useWisprStore((s) => s.history);
  return hydrated ? history : EMPTY_HISTORY;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
