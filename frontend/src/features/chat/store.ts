import { create } from 'zustand'
import { ApiError } from '@/lib/api'
import { chatApi, type StoredSession } from './api'
import type { ChatMessage, ChatReply, EnquiryDraft } from './types'

const GREETING = "Hello, I'm Oddly, your personal shopping assistant. I can help you find a piece, compare a few, " +
  'answer questions about shipping and returns, or start a custom creation.'
const FALLBACK_SUGGESTIONS = ['Explore home decor', 'Find a gift', 'Show me sculptures', 'Explore custom creations']

let seq = 0
/** Bumped by clear(), so a reply or error still in flight lands nowhere. */
let generation = 0
const localId = () => `local-${Date.now()}-${seq++}`
const greeting = (text = GREETING): ChatMessage => ({ id: 'greeting', role: 'assistant', content: text, type: 'text', payload: {} })

const fromReply = (r: ChatReply): ChatMessage => ({
  id: localId(), role: 'assistant', content: r.message, type: r.type,
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
  /** Slug of the product page the shopper has open, if any. */
  viewing: string | null
  setOpen: (open: boolean) => void
  newConversation: () => Promise<void>
  /** Wipe the conversation on screen at once; the next message starts a fresh one on the server. */
  clear: () => void
  send: (text: string) => Promise<void>
  retry: (id: string) => Promise<void>
  enquirySent: (messageId: string, draft: EnquiryDraft, reply: string) => void
}

export const useChat = create<ChatState>((set, get) => ({
  open: false,
  session: null,
  messages: [],
  suggestions: FALLBACK_SUGGESTIONS,
  booting: false,
  sending: false,
  error: null,
  viewing: null,

  setOpen: (open) => {
    set({ open })
    if (open && !get().messages.length && !get().booting) void get().newConversation()
  },

  newConversation: async () => {
    set({ session: null, messages: [greeting()], booting: true, error: null, sending: false })
    try {
      const s = await chatApi.createSession()
      const session = { id: s.session_id, token: s.token, expiresAt: s.expires_at }
      set({ session, messages: [greeting(s.greeting)], suggestions: s.suggestions.length ? s.suggestions : FALLBACK_SUGGESTIONS })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ booting: false })
    }
  },

  clear: () => {
    generation++
    set({ session: null, messages: [greeting()], suggestions: FALLBACK_SUGGESTIONS, booting: false, sending: false, error: null })
  },

  send: async (raw) => {
    const text = raw.trim()
    if (!text || get().sending) return
    const userMsg: ChatMessage = { id: localId(), role: 'user', content: text, type: 'text', payload: {} }
    const gen = generation
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
        const reply = await chatApi.send(session, text, get().viewing)
        if (gen !== generation) return  // cleared while waiting: drop the late reply
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
      if (gen !== generation) return
      set((s) => ({
        messages: s.messages.map((m) => (m.id === userMsg.id ? { ...m, failed: true } : m)),
        error: (e as Error).message || 'Something went wrong. Try again.',
      }))
    } finally {
      if (gen === generation) set({ sending: false })
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
}))
