import { create } from "zustand";

interface UIState {
  scrollPositions: Record<string, number>;
  setScroll: (path: string, y: number) => void;
  getScroll: (path: string) => number;
}

export const useUIStore = create<UIState>((set, get) => ({
  scrollPositions: {},
  setScroll: (path, y) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [path]: y },
    })),
  getScroll: (path) => get().scrollPositions[path] || 0,
}));