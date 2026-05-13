import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user:        null,
      house:       null,
      role:        null,
      memberships: [],
      accessToken: null,
      isLoading:   false,

      setAuth: (user, accessToken, house, role, memberships) =>
        set({ user, accessToken, house: house || null, role: role || null, memberships: memberships || [] }),

      clearAuth: () => set({ user: null, accessToken: null, house: null, role: null, memberships: [] }),
      setLoading: (v) => set({ isLoading: v }),
      setHouse:   (house) => set({ house }),
    }),
    {
      name: "telemetryx-auth",
      partialize: (s) => ({
        user:        s.user,
        accessToken: s.accessToken,
        house:       s.house,
        role:        s.role,
        memberships: s.memberships,
      }),
    }
  )
);

export default useAuthStore;
