import { create } from 'zustand'

interface UiState {
  cartOpen: boolean
  searchOpen: boolean
  menuOpen: boolean
  setCart: (open: boolean) => void
  setSearch: (open: boolean) => void
  setMenu: (open: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  cartOpen: false,
  searchOpen: false,
  menuOpen: false,
  setCart: (cartOpen) => set({ cartOpen, searchOpen: false, menuOpen: false }),
  setSearch: (searchOpen) => set({ searchOpen, cartOpen: false, menuOpen: false }),
  setMenu: (menuOpen) => set({ menuOpen }),
}))
