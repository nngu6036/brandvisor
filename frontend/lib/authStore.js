"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// MVP demo auth store:
// - accepts any credentials
// - stores session in localStorage for demo persistence
export const useAuthStore = create(
  persist(
    (set) => ({
      isAuthed: false,
      user: null,
      login: (user) => set({ isAuthed: true, user }),
      logout: () => set({ isAuthed: false, user: null })
    }),
    { name: "brandvisor-demo-auth" }
  )
);
