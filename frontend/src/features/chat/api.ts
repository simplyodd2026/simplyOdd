import { api } from '@/lib/api'
import type { ChatReply, EnquiryDraft, SessionOut } from './types'

/** This tab's conversation: the session id plus the token that proves it owns it. Held in memory only, so
 *  every page load starts a fresh, one-off chat. */
export interface StoredSession { id: string; token: string; expiresAt: string }

const VISITOR_KEY = 'so-chat-visitor'

function read<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null } catch { return null }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch { /* private mode: the conversation just won't survive a reload */ }
}

// Conversations used to be kept across reloads; drop any left behind.
write('so-chat-session', null)

/** A random id for this browser, so limits and analytics can tell visitors apart without knowing who they are. */
export function visitorId(): string {
  let id = read<string>(VISITOR_KEY)
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = `v_${crypto.getRandomValues(new Uint32Array(3)).join('')}`.slice(0, 40)
    write(VISITOR_KEY, id)
  }
  return id
}

/** Slug of the product page the shopper has open, so the assistant knows what "this one" means. */
export function viewingProduct(path: string): string | null {
  const m = /^\/product\/([A-Za-z0-9_-]{1,140})\/?$/.exec(path)
  return m ? m[1] : null
}

const token = (s: StoredSession) => ({ 'X-Chat-Token': s.token })

export const chatApi = {
  createSession: () => api<SessionOut>('/chat/sessions', { body: { visitor_id: visitorId() } }),
  send: (s: StoredSession, message: string, viewing: string | null = null) =>
    api<ChatReply>('/chat/message', { body: { session_id: s.id, message, viewing }, headers: token(s) }),
  enquiry: (s: StoredSession, draft: Omit<EnquiryDraft, 'missing' | 'errors' | 'ready' | 'submitted' | 'request_id'>) =>
    api<{ id: string; message: string }>('/chat/enquiries', { body: { session_id: s.id, ...draft }, headers: token(s) }),
}
