import { EditorInfo, EffectInfo } from "@/types/editor";
import { create } from "zustand";

interface EditorStore extends EditorInfo {
  pushEffect: (info: EffectInfo) => void;
  goBack: () => void;
}

export const editorStore = create<EditorStore>((set) => ({
  effectStack: [],
  pushEffect: (info) => {
    set((state) => {
      return {
        effectStack: [...state.effectStack, info],
      };
    });
  },
  goBack: () => {
    set((state) => ({
      effectStack: state.effectStack.slice(0, -1),
    }));
  },
}));
