import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider, getAuth, linkWithPopup, onIdTokenChanged, signInAnonymously, signInWithCredential, signInWithPopup, signOut,
  type User,
} from 'firebase/auth'
import type { AuthClient, SessionUser } from './types'

const FRIENDLY: Record<string, string> = {
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/network-request-failed': "Can't reach the sign-in service. Check your connection.",
  'auth/unauthorized-domain': "Sign-in isn't enabled for this domain yet. Add it under Firebase Authentication → Settings → Authorized domains.",
  'auth/operation-not-allowed': 'Google sign-in is turned off. Enable it under Firebase Authentication → Sign-in method.',
  'auth/disallowed-useragent': 'Google sign-in doesn’t work inside this app’s browser. Open the page in Chrome or Safari to sign in.',
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
    isAnonymous: u.isAnonymous,
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
        if (fa.currentUser?.isAnonymous) {
          // A guest who checked out: link Google to the same uid so their orders become part of the account.
          try {
            const { user } = await linkWithPopup(fa.currentUser, google)
            await user.getIdToken(true) // fires onIdTokenChanged so the session sees a real user
          } catch (e) {
            const credential = (e as { code?: string }).code === 'auth/credential-already-in-use' && GoogleAuthProvider.credentialFromError(e as never)
            if (!credential) throw e
            await signInWithCredential(fa, credential) // they already had an account: sign into that one
          }
        } else {
          await signInWithPopup(fa, google)
        }
      } catch (e) {
        const code = (e as { code?: string }).code ?? ''
        if (!CANCELLED.has(code)) console.error('Firebase sign-in failed:', code, e)
        if (!CANCELLED.has(code)) throw new Error(FRIENDLY[code] ?? 'Sign-in failed. Try again.')
      }
    },
    ensureGuest: async () => {
      if (fa.currentUser) return
      try {
        await signInAnonymously(fa)
      } catch (e) {
        const code = (e as { code?: string }).code ?? ''
        console.error('Guest checkout sign-in failed:', code, e)
        throw new Error(code === 'auth/network-request-failed' ? FRIENDLY[code]
          : code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation'
            ? 'Guest checkout isn’t switched on yet. Enable Anonymous under Firebase Authentication → Sign-in method.'
            : 'We couldn’t start checkout. Try again.')
      }
    },
    signOut: () => signOut(fa),
  }
}
