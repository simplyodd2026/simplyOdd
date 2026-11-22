import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { lockScroll, unlockScroll } from '@/lib/scroll'
import { useSession } from '@/stores/session'
import { chatApi } from './api'
import { useChat } from './store'
import { ComparisonTable, ContactLinks, EnquiryCard, MoreAnswers, OrderList, ProductRail, RichText, Typing } from './parts'
import { MAX_CHARS, type ChatMessage } from './types'

const MOBILE = '(max-width: 639px)'
const isMobile = () => typeof window !== 'undefined' && window.matchMedia?.(MOBILE).matches

function AssistantMessage({ m, onNavigate, latestEnquiry }: { m: ChatMessage; onNavigate: () => void; latestEnquiry: boolean }) {
  const { enquirySent, session } = useChat()
  const p = m.payload
  return (
    <div className="space-y-3">
      <div className="text-[14.5px] leading-relaxed text-graphite"><RichText text={m.content} /></div>
      {p.comparison ? <ComparisonTable comparison={p.comparison} onNavigate={onNavigate} />
        : p.products && p.products.length > 0 && <ProductRail products={p.products} explore={p.explore} onNavigate={onNavigate} />}
      {p.orders && p.orders.length > 0 && <OrderList orders={p.orders} onNavigate={onNavigate} />}
      {p.faq && p.faq.length > 1 && <MoreAnswers items={p.faq.slice(1)} />}
      {/* A brief collected over several turns: only the latest draft is a live form. */}
      {p.enquiry && (p.enquiry.submitted || (latestEnquiry && m.type === 'custom_enquiry')) && (
        <EnquiryCard draft={p.enquiry} onSubmit={async (d) => {
          if (!session) throw new Error('Start a new conversation and try again.')
          const out = await chatApi.enquiry(session, d)
          enquirySent(m.id, { ...p.enquiry!, ...d, request_id: out.id }, out.message)
        }} />
      )}
      {p.links && p.links.length > 0 && <ContactLinks links={p.links} onNavigate={onNavigate} />}
    </div>
  )
}

const THIS_PIECE = 'Tell me about this piece'

export default function ChatPanel() {
  const { messages, suggestions, sending, booting, error, viewing, send, retry, setOpen, newConversation, clear } = useChat()
  const uid = useSession((s) => s.user?.uid ?? null)
  // On a product page, offer to talk about the piece on screen first.
  const chips = viewing && !suggestions.includes(THIS_PIECE) ? [THIS_PIECE, ...suggestions].slice(0, 4) : suggestions
  const [text, setText] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const close = () => setOpen(false)
  // On a phone the panel covers the page, so following a product link should reveal it.
  const onNavigate = () => { if (isMobile()) close() }

  // A different account, or signing out, starts a new conversation: chats aren't shared across people on one device.
  const lastUid = useRef(uid)
  useEffect(() => {
    if (lastUid.current !== uid) {
      if (lastUid.current) void newConversation()
      lastUid.current = uid
    }
  }, [uid, newConversation])

  useEffect(() => {
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 80)
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const mobile = isMobile()
    if (mobile) lockScroll()
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); if (mobile) unlockScroll() }
  }, [])

  useEffect(() => {
    const el = body.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 2 ? 'smooth' : 'auto' })
  }, [messages.length, sending])

  const submit = (value = text) => {
    if (!value.trim() || sending || value.length > MAX_CHARS) return
    setText('')
    void send(value)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
  }
  const over = text.length > MAX_CHARS
  const lastFailed = [...messages].reverse().find((m) => m.role === 'user')?.failed
  const latestEnquiryId = [...messages].reverse().find((m) => m.payload.enquiry)?.id

  return (
    <motion.section role="dialog" aria-label="Oddly Assistant" aria-modal={false}
      initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: 'bottom right' }}
      className="fixed inset-0 z-50 flex flex-col bg-paper text-graphite sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(44rem,calc(100dvh-3rem))] sm:w-[25.5rem]
        sm:overflow-hidden sm:rounded-[1.75rem_0.375rem_1.75rem_1.75rem] sm:border sm:border-rule sm:shadow-[0_1px_0_rgb(42_31_23/0.04),0_40px_80px_-30px_rgb(66_44_28/0.55)]">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-rule px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <h2 className="font-display text-[1.6rem] leading-[1.05] text-ink">Oddly Assistant</h2>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-smoke">
            <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-olive/50" /><span className="relative size-2 rounded-full bg-olive" /></span>
            <span>Your personal shopping assistant</span>
            <span className="sr-only">Online</span>
          </p>
        </div>
        <div className="-mr-2 flex items-center">
          <button onClick={() => { clear(); setText(''); input.current?.focus() }} disabled={messages.length <= 1}
            aria-label="Clear chat" title="Clear chat"
            className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:opacity-40"><Icon name="trash" size={18} /></button>
          <button onClick={close} aria-label="Close assistant"
            className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/5"><Icon name="close" size={18} /></button>
        </div>
      </header>

      <div ref={body} data-lenis-prevent className="linen flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5" aria-live="polite" aria-busy={sending}>
        {messages.map((m) => m.role === 'user' ? (
          <div key={m.id} className="flex flex-col items-end gap-1">
            <p className={cn('max-w-[85%] whitespace-pre-wrap break-words rounded-[1.25rem_1.25rem_0.375rem_1.25rem] bg-ink px-4 py-2.5 text-[14.5px] text-paper',
              m.failed && 'opacity-60')}>{m.content}</p>
            {m.failed && (
              <button onClick={() => retry(m.id)} className="text-[12.5px] text-accent underline underline-offset-4">Not sent. Try again</button>
            )}
          </div>
        ) : (
          <div key={m.id}>
            <p className="mb-1.5 font-odd text-[0.95rem] text-fog">Oddly</p>
            <AssistantMessage m={m} onNavigate={onNavigate} latestEnquiry={m.id === latestEnquiryId} />
          </div>
        ))}
        {(sending || booting) && <Typing />}
        {error && lastFailed && <p className="text-[13px] text-accent" role="alert">{error}</p>}
        {error && !lastFailed && !booting && messages.length <= 1 && (
          <p className="text-[13px] text-accent" role="alert">{error} <button className="underline underline-offset-4" onClick={() => void newConversation()}>Retry</button></p>
        )}
      </div>

      <div className="shrink-0 border-t border-rule bg-paper px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3">
        {chips.length > 0 && !sending && (
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 scrollbar-none" data-lenis-prevent aria-label="Suggested questions">
            {chips.map((s) => (
              <button key={s} onClick={() => submit(s)}
                className="shrink-0 rounded-full border border-rule px-3.5 py-1.5 text-[13px] text-ink transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper">
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex items-end gap-2">
          <label htmlFor="oddly-input" className="sr-only">Message Oddly</label>
          <textarea id="oddly-input" ref={input} value={text} rows={1} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Ask about a piece, a gift or an order" maxLength={MAX_CHARS + 50} aria-invalid={over || undefined}
            className={cn('max-h-32 min-h-11 flex-1 resize-none rounded-[1.25rem] border bg-paper-2 px-4 py-[0.7rem] text-[15px] leading-snug text-ink outline-none transition-colors placeholder:text-fog/80 focus:border-tertiary [field-sizing:content]',
              over ? 'border-accent' : 'border-rule')} />
          <button type="submit" disabled={!text.trim() || sending || over} aria-label="Send message"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-action text-white transition-colors hover:bg-action-hover active:bg-action-active disabled:opacity-40">
            <Icon name="send" size={18} strokeWidth={1.7} />
          </button>
        </form>
        {text.length > MAX_CHARS - 100 && (
          <p className={cn('mt-1.5 text-right text-[12px] tabular-nums', over ? 'text-accent' : 'text-fog')}>{text.length} / {MAX_CHARS}</p>
        )}
      </div>
    </motion.section>
  )
}
