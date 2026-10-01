export interface SessionUser {
  uid: string
  email: string | null
  name: string | null
  photoURL: string | null
  emailVerified: boolean
  provider: 'password' | 'google' | 'dev'
}

/** The storefront only depends on this interface, never on Firebase directly. */
export interface AuthClient {
  readonly mode: 'firebase' | 'dev'
  onChange(cb: (user: SessionUser | null) => void): () => void
  getToken(forceRefresh?: boolean): Promise<string | null>
  /** Google creates the account on first sign-in, so there is no separate sign-up. */
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  /** Dev mode only: sign in as any email without a password. */
  devSignIn?(email: string): Promise<void>
}
