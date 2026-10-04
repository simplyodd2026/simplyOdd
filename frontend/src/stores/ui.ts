import { create } from 'zustand'

interface UiState {
  cartOpen: boolean
  searchOpen: boolean
  menuOpen: boolean
  /** True while a full-bleed dark hero sits under the header, so the header can switch to light text. */
  heroDark: boolean
  setHeroDark: (dark: boolean) => void
  setCart: (open: boolean) => void
  setSearch: (open: boolean) => void
  setMenu: (open: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  cartOpen: false,
  searchOpen: false,
  menuOpen: false,
  heroDark: false,
  setHeroDark: (heroDark) => set({ heroDark }),
  setCart: (cartOpen) => set({ cartOpen, searchOpen: false, menuOpen: false }),
  setSearch: (searchOpen) => set({ searchOpen, cartOpen: false, menuOpen: false }),
  setMenu: (menuOpen) => set({ menuOpen }),
}))
