import { create } from 'zustand'
import { ApiError } from '@/lib/api'
import { chatApi, saveSession, storedSession, type StoredSession } from './api'
import type { ChatMessage, ChatReply, EnquiryDraft } from './types'

const GREETING = "Hello, I'm Oddly, your personal shopping assistant. I can help you find a piece, compare a few, " +
  'answer questions about shipping and returns, or start a custom creation.'
const FALLBACK_SUGGESTIONS = ['Explore home decor', 'Find a gift', 'Show me sculptures', 'Explore custom creations']

let seq = 0
const localId = () => `local-${Date.now()}-${seq++}`
const greeting = (text = GREETING): ChatMessage => ({ id: 'greeting', role: 'assistant', content: text, type: 'text', payload: {} })

const fromReply = (r: ChatReply): ChatMessage => ({
  id: r.message_id ?? localId(), messageId: r.message_id, role: 'assistant', content: r.message, type: r.type,
  payload: { products: r.products, comparison: r.comparison, faq: r.faq, enquiry: r.enquiry, orders: r.orders, fallback: r.fallback },
})

/** The conversation is gone or isn't ours any more (signed out, expired): start a fresh one. */
const isLost = (e: unknown) => e instanceof ApiError && [403, 404, 410].includes(e.status)

interface ChatState {
  open: boolean
  session: StoredSession | null
  messages: ChatMessage[]
  suggestions: string[]
  booting: boolean
  sending: boolean
  error: string | null
  setOpen: (open: boolean) => void
  boot: () => Promise<void>
  newConversation: () => Promise<void>
  send: (text: string) => Promise<void>
  retry: (id: string) => Promise<void>
  enquirySent: (messageId: string, draft: EnquiryDraft, reply: string) => void
  rate: (id: string, rating: 'up' | 'down') => Promise<void>
}

export const useChat = create<ChatState>((set, get) => ({
  open: false,
  session: storedSession(),
  messages: [],
  suggestions: FALLBACK_SUGGESTIONS,
  booting: false,
  sending: false,
  error: null,

  setOpen: (open) => {
    set({ open })
    if (open && !get().messages.length) void get().boot()
  },

  boot: async () => {
    if (get().booting) return
    const session = get().session
    if (!session) return get().newConversation()
    set({ booting: true, error: null })
    try {
      const { messages } = await chatApi.history(session)
      const restored: ChatMessage[] = messages.map((m) => ({
        id: m.id, messageId: m.role === 'assistant' ? m.id : null, role: m.role, content: m.content, type: m.type, payload: m.payload,
      }))
      const last = [...messages].reverse().find((m) => m.role === 'assistant')
      set({ messages: [greeting(), ...restored], suggestions: last?.payload.suggestions?.length ? last.payload.suggestions : FALLBACK_SUGGESTIONS })
    } catch (e) {
      if (isLost(e)) { set({ booting: false }); return get().newConversation() }
      set({ messages: [greeting()], error: (e as Error).message })
    } finally {
      set({ booting: false })
    }
  },

  newConversation: async () => {
    saveSession(null)
    set({ session: null, messages: [greeting()], booting: true, error: null, sending: false })
    try {
      const s = await chatApi.createSession()
      const session = { id: s.session_id, token: s.token, expiresAt: s.expires_at }
      saveSession(session)
      set({ session, messages: [greeting(s.greeting)], suggestions: s.suggestions.length ? s.suggestions : FALLBACK_SUGGESTIONS })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ booting: false })
    }
  },

  send: async (raw) => {
    const text = raw.trim()
    if (!text || get().sending) return
    const userMsg: ChatMessage = { id: localId(), role: 'user', content: text, type: 'text', payload: {} }
    set((s) => ({ messages: [...s.messages, userMsg], sending: true, error: null, suggestions: [] }))
    const attempt = async (retried: boolean): Promise<void> => {
      let session = get().session
      if (!session) {
        await get().newConversation()
        session = get().session
        if (!session) throw new Error(get().error ?? "Can't reach the assistant right now.")
        set((s) => ({ messages: [...s.messages, userMsg] }))
      }
      try {
        const reply = await chatApi.send(session, text)
        set((s) => ({ messages: [...s.messages, fromReply(reply)], suggestions: reply.suggestions ?? [] }))
      } catch (e) {
        if (isLost(e) && !retried) {
          // Keep what the shopper typed: open a new conversation and send it there.
          await get().newConversation()
          set((s) => ({ messages: [...s.messages, userMsg] }))
          return attempt(true)
        }
        throw e
      }
    }
    try {
      await attempt(false)
    } catch (e) {
      set((s) => ({
        messages: s.messages.map((m) => (m.id === userMsg.id ? { ...m, failed: true } : m)),
        error: (e as Error).message || 'Something went wrong. Try again.',
      }))
    } finally {
      set({ sending: false })
    }
  },

  retry: async (id) => {
    const msg = get().messages.find((m) => m.id === id)
    if (!msg) return
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) }))
    await get().send(msg.content)
  },

  enquirySent: (messageId, draft, reply) => set((s) => ({
    messages: [
      ...s.messages.map((m) => (m.id === messageId ? { ...m, payload: { ...m.payload, enquiry: { ...draft, submitted: true } } } : m)),
      { id: localId(), role: 'assistant', content: reply, type: 'text', payload: {} },
    ],
    suggestions: ['Explore home decor', 'Find a gift'],
  })),

  rate: async (id, rating) => {
    const { session, messages } = get()
    const msg = messages.find((m) => m.id === id)
    if (!session || !msg?.messageId) return
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, feedback: rating } : m)) }))
    try { await chatApi.feedback(session, msg.messageId, rating) } catch { /* feedback is best-effort */ }
  },
}))
