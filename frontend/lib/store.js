import { create } from "zustand";

export const useBrandStore = create((set) => ({
  activeBrand: null,
  setActiveBrand: (brand) => set({ activeBrand: brand }),
  clearBrand: () => set({ activeBrand: null }),

  activeProject: null,
  setActiveProject: (project) => set({ activeProject: project }),
  clearProject: () => set({ activeProject: null }),

  // ✅ Project Ideas (shared between IdeasNav + IdeasStrip)
  projectIdeas: [],
  projectIdeasProjectId: null,
  projectIdeasLoading: false,
  projectIdeasError: null,

  setProjectIdeasState: (patch) => set((s) => ({ ...s, ...patch })),

  // SSE workflow state (shared globally)
  sseConnected: false,
  sseConnecting: false,
  sseUI: {
    title: "",
    message: "",
    workflow_type: null,
    workflow_status: null,
    workflow_state: null,
  },
  sseLog: [],
  setSseState: (patch) => set((s) => ({ ...s, ...patch })),
  pushSseLog: (entry) =>
    set((s) => {
      const next = [...(Array.isArray(s.sseLog) ? s.sseLog : []), entry];
      return { ...s, sseLog: next.slice(-6) };
    }),
  resetSseState: () =>
    set({
      sseConnected: false,
      sseConnecting: false,
      sseUI: {
        title: "",
        message: "",
        workflow_type: null,
        workflow_status: null,
        workflow_state: null,
      },
      sseLog: [],
    }),

  clearProjectIdeas: () =>
    set({
      projectIdeas: [],
      projectIdeasProjectId: null,
      projectIdeasLoading: false,
      projectIdeasError: null
    })
}));
