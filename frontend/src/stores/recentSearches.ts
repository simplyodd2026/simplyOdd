import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface RecentState {
  terms: string[]
  add: (term: string) => void
  clear: () => void
}

export const useRecentSearches = create<RecentState>()(
  persist(
    (set, get) => ({
      terms: [],
      add: (term) => {
        const t = term.trim()
        if (t.length < 2) return
        set({ terms: [t, ...get().terms.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6) })
      },
      clear: () => set({ terms: [] }),
    }),
    { name: 'om.recent-searches', storage: createJSONStorage(() => localStorage) },
  ),
)
