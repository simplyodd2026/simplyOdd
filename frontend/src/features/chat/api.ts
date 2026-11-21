import { api } from '@/lib/api'
import type { ChatReply, EnquiryDraft, HistoryMessage, SessionOut } from './types'

/** The browser's own conversation: the session id plus the token that proves it owns it. */
export interface StoredSession { id: string; token: string; expiresAt: string }

const SESSION_KEY = 'so-chat-session'
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

export function storedSession(): StoredSession | null {
  const s = read<StoredSession>(SESSION_KEY)
  return s && new Date(s.expiresAt) > new Date() ? s : null
}
export const saveSession = (s: StoredSession | null) => write(SESSION_KEY, s)

/** A random id for this browser, so limits and analytics can tell visitors apart without knowing who they are. */
export function visitorId(): string {
  let id = read<string>(VISITOR_KEY)
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = `v_${crypto.getRandomValues(new Uint32Array(3)).join('')}`.slice(0, 40)
    write(VISITOR_KEY, id)
  }
  return id
}

const token = (s: StoredSession) => ({ 'X-Chat-Token': s.token })

export const chatApi = {
  createSession: () => api<SessionOut>('/chat/sessions', { body: { visitor_id: visitorId() } }),
  history: (s: StoredSession) => api<{ messages: HistoryMessage[] }>(`/chat/history/${s.id}`, { headers: token(s) }),
  send: (s: StoredSession, message: string) =>
    api<ChatReply>('/chat/message', { body: { session_id: s.id, message }, headers: token(s) }),
  enquiry: (s: StoredSession, draft: Omit<EnquiryDraft, 'missing' | 'errors' | 'ready' | 'submitted' | 'request_id'>) =>
    api<{ id: string; message: string }>('/chat/enquiries', { body: { session_id: s.id, ...draft }, headers: token(s) }),
  feedback: (s: StoredSession, messageId: string, rating: 'up' | 'down') =>
    api<{ ok: boolean }>('/chat/feedback', { body: { session_id: s.id, message_id: messageId, rating }, headers: token(s) }),
}
