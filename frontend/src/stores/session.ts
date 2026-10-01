import { create } from 'zustand'
import type { SessionUser } from '@/lib/auth'
import type { UserProfile } from '@/lib/types'

interface SessionState {
  user: SessionUser | null
  profile: UserProfile | null
  ready: boolean
  set: (s: Partial<Pick<SessionState, 'user' | 'profile' | 'ready'>>) => void
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  profile: null,
  ready: false,
  set: (s) => set(s),
}))

export const isSignedIn = () => !!useSession.getState().user
