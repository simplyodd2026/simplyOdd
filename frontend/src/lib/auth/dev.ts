import type { AuthClient, SessionUser } from './types'

/**
 * Local stand-in for Firebase Auth so the storefront runs without a Firebase
 * project. It issues `dev:<uid>:<email>:<name>` tokens that the backend only
 * accepts when ALLOW_DEV_AUTH=true. Any password works. Sign in as
 * admin@simplyodd.dev to reach the admin dashboard.
 */
const KEY = 'om.dev-user'
const listeners = new Set<(u: SessionUser | null) => void>()

const read = (): SessionUser | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}
const write = (u: SessionUser | null) => {
  try {
    if (u) localStorage.setItem(KEY, JSON.stringify(u))
    else localStorage.removeItem(KEY)
  } catch { /* storage unavailable: session lasts for this tab only */ }
  current = u
  listeners.forEach((cb) => cb(u))
}
let current = read()

const uidFor = (email: string) => {
  // Keep the seeded demo accounts' ids so their orders show up.
  if (email === 'demo@simplyodd.dev') return 'demo-customer'
  if (email === 'diveshkasyap5@gmail.com') return 'dev-admin'
  return `dev-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
}

const user = (email: string, name: string | null, provider: SessionUser['provider'] = 'dev'): SessionUser => ({
  uid: uidFor(email), email, name, photoURL: null, emailVerified: true, provider,
})

const validEmail = (email: string) => {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("That doesn't look like an email address.")
}

export function createDevAuth(): AuthClient {
  return {
    mode: 'dev',
    onChange: (cb) => {
      listeners.add(cb)
      queueMicrotask(() => cb(current))
      return () => listeners.delete(cb)
    },
    getToken: async () => (current ? `dev:${current.uid}:${current.email}:${current.name ?? ''}` : null),
    devSignIn: async (email) => {
      validEmail(email)
      write(user(email, email === 'diveshkasyap5@gmail.com' ? 'Studio Admin' : email === 'demo@simplyodd.dev' ? 'Aarav Mehta' : email.split('@')[0]))
    },
    signInWithGoogle: async () => write(user('google.user@simplyodd.dev', 'Google User', 'google')),
    signOut: async () => write(null),
  }
}
