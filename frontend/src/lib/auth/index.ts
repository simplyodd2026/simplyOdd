import { createDevAuth } from './dev'
import { createFirebaseAuth } from './firebase'
import type { AuthClient } from './types'

export type { SessionUser } from './types'

export const auth: AuthClient = import.meta.env.VITE_FIREBASE_API_KEY ? createFirebaseAuth() : createDevAuth()
