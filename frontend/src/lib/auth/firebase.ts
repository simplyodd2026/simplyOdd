import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth, onIdTokenChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import type { AuthClient, SessionUser } from './types'

const FRIENDLY: Record<string, string> = {
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/network-request-failed': "Can't reach the sign-in service. Check your connection.",
}
// Closing the Google window is a choice, not an error.
const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])

const toSession = (u: User | null): SessionUser | null =>
  u && {
    uid: u.uid,
    email: u.email,
    name: u.displayName,
    photoURL: u.photoURL,
    emailVerified: u.emailVerified,
    provider: u.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'password',
  }

export function createFirebaseAuth(): AuthClient {
  const env = import.meta.env
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  const fa = getAuth(app)
  const google = new GoogleAuthProvider()
  google.setCustomParameters({ prompt: 'select_account' })

  return {
    mode: 'firebase',
    onChange: (cb) => onIdTokenChanged(fa, (u) => cb(toSession(u))),
    getToken: async (force) => (fa.currentUser ? fa.currentUser.getIdToken(force) : null),
    signInWithGoogle: async () => {
      try {
        await signInWithPopup(fa, google)
      } catch (e) {
        const code = (e as { code?: string }).code ?? ''
        if (!CANCELLED.has(code)) throw new Error(FRIENDLY[code] ?? 'Sign-in failed. Try again.')
      }
    },
    signOut: () => signOut(fa),
  }
}
