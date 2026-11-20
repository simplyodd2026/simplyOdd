import { create } from 'zustand'
import type { SessionUser } from '@/lib/auth'
import type { UserProfile } from '@/lib/types'

interface SessionState {
  user: SessionUser | null
  /** Set while checking out as a guest (anonymous auth); `user` stays null. */
  guestUid: string | null
  profile: UserProfile | null
  ready: boolean
  set: (s: Partial<Pick<SessionState, 'user' | 'guestUid' | 'profile' | 'ready'>>) => void
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  guestUid: null,
  profile: null,
  ready: false,
  set: (s) => set(s),
}))

export const isSignedIn = () => !!useSession.getState().user
