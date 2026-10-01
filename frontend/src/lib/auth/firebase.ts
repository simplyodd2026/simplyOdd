import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider, applyActionCode, confirmPasswordReset, createUserWithEmailAndPassword, getAuth,
  onIdTokenChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup,
  signOut, updateProfile, type User,
} from 'firebase/auth'
import type { AuthClient, SessionUser } from './types'

const FRIENDLY: Record<string, string> = {
  'auth/invalid-credential': "That email and password don't match. Try again or reset your password.",
  'auth/wrong-password': "That email and password don't match. Try again or reset your password.",
  'auth/user-not-found': "There's no account with that email. Create one instead.",
  'auth/email-already-in-use': 'An account with that email already exists. Sign in instead.',
  'auth/weak-password': 'Use at least 8 characters for your password.',
  'auth/invalid-email': "That doesn't look like an email address.",
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
  'auth/expired-action-code': 'This link has expired. Request a new one.',
  'auth/invalid-action-code': 'This link has already been used or is invalid. Request a new one.',
  'auth/network-request-failed': "Can't reach the sign-in service. Check your connection.",
}

const wrap = async <T,>(p: Promise<T>): Promise<T> => {
  try {
    return await p
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    throw new Error(FRIENDLY[code] ?? 'Sign-in failed. Try again.')
  }
}

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
  const actionSettings = () => ({ url: `${window.location.origin}/login` })

  return {
    mode: 'firebase',
    onChange: (cb) => onIdTokenChanged(fa, (u) => cb(toSession(u))),
    getToken: async (force) => (fa.currentUser ? fa.currentUser.getIdToken(force) : null),
    signIn: async (email, password) => { await wrap(signInWithEmailAndPassword(fa, email, password)) },
    signUp: async (name, email, password) => {
      const cred = await wrap(createUserWithEmailAndPassword(fa, email, password))
      await updateProfile(cred.user, { displayName: name })
      await sendEmailVerification(cred.user, actionSettings()).catch(() => undefined)
      await cred.user.getIdToken(true)
    },
    signInWithGoogle: async () => { await wrap(signInWithPopup(fa, new GoogleAuthProvider())) },
    signOut: () => signOut(fa),
    sendPasswordReset: (email) => wrap(sendPasswordResetEmail(fa, email, actionSettings())),
    confirmPasswordReset: (code, pw) => wrap(confirmPasswordReset(fa, code, pw)),
    applyEmailVerification: (code) => wrap(applyActionCode(fa, code)),
    sendEmailVerification: async () => {
      if (fa.currentUser) await wrap(sendEmailVerification(fa.currentUser, actionSettings()))
    },
    reload: async () => {
      if (!fa.currentUser) return null
      await fa.currentUser.reload()
      await fa.currentUser.getIdToken(true)
      return toSession(fa.currentUser)
    },
  }
}
