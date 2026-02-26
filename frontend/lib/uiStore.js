"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
  persist(
    (set) => ({
      sidebarHidden: false,
      hideSidebar: () => set({ sidebarHidden: true }),
      showSidebar: () => set({ sidebarHidden: false }),
      toggleSidebar: () => set((s) => ({ sidebarHidden: !s.sidebarHidden }))
    }),
    { name: "brandvisor-ui" }
  )
);
