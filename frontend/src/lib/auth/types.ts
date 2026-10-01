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
  signIn(email: string, password: string): Promise<void>
  signUp(name: string, email: string, password: string): Promise<void>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  confirmPasswordReset(code: string, newPassword: string): Promise<void>
  applyEmailVerification(code: string): Promise<void>
  sendEmailVerification(): Promise<void>
  reload(): Promise<SessionUser | null>
}
