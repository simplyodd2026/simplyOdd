import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/auth', () => ({ auth: { getToken: async () => null, onChange: () => () => {} } }))
const scroll = vi.hoisted(() => ({ lockScroll: vi.fn(), unlockScroll: vi.fn() }))
vi.mock('@/lib/scroll', () => scroll)

import { ChatWidget } from './ChatWidget'
import { useChat } from './store'
import type { ChatReply } from './types'

const SESSION = { session_id: 'cs_0123456789abcdef', token: 'tok-1', expires_at: '2099-01-01T00:00:00Z',
  greeting: 'Hello from the studio.', suggestions: ['Explore lighting', 'Find a gift'] }

const reply = (over: Partial<ChatReply> = {}): ChatReply => ({
  session_id: SESSION.session_id, message_id: 'cm_0123456789abcdef', type: 'text', message: 'Hi there.',
  products: [], comparison: null, faq: [], enquiry: null, orders: [], suggestions: [], fallback: false, ...over,
})

const MELT = { id: 'p_1', slug: 'melt-vase', name: 'Melt Vase', price: 2490, compare_at_price: null, price_varies: false,
  image: 'https://example.com/melt.webp', url: '/product/melt-vase', summary: 'A vase caught mid-melt' }
const GHOST = { ...MELT, id: 'p_2', slug: 'ghost-lamp', name: 'Ghost Lamp', price: 4290, url: '/product/ghost-lamp' }

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>
let handler: Handler
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const fetchMock = vi.fn((url: string, init: RequestInit = {}) => Promise.resolve(handler(url, init)))

function routes(message: (body: { message: string }) => Response | Promise<Response>): Handler {
  return (url, init) => {
    if (url.endsWith('/api/chat/sessions')) return json(SESSION, 201)
    if (url.endsWith('/api/chat/message')) return message(JSON.parse(String(init.body)))
    if (url.endsWith('/api/chat/enquiries')) return json({ ok: true, id: 'cr_1', message: 'Your brief is with the studio.' }, 201)
    if (url.endsWith('/api/chat/feedback')) return json({ ok: true })
    return json({ detail: 'not found' }, 404)
  }
}

function renderAt(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><ChatWidget /></MemoryRouter>)
}

async function openWidget() {
  fireEvent.click(screen.getByRole('button', { name: 'Open Oddly Assistant' }))
  return screen.findByRole('dialog', { name: 'Oddly Assistant' })
}

async function sendMessage(text: string) {
  const input = await screen.findByLabelText('Message Oddly')
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockClear()
  scroll.lockScroll.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  useChat.setState({ open: false, session: null, messages: [], suggestions: [], booting: false, sending: false, error: null })
  handler = routes(() => json(reply()))
})

describe('ChatWidget', () => {
  it('opens with a greeting and suggestions, and closes again', async () => {
    renderAt()
    const dialog = await openWidget()
    expect(within(dialog).getByRole('heading', { name: 'Oddly Assistant' })).toBeTruthy()
    expect(within(dialog).getByText('Your personal shopping assistant')).toBeTruthy()
    expect(await within(dialog).findByText('Hello from the studio.')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Explore lighting' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close assistant' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Open Oddly Assistant' })).toBeTruthy()
  })

  it('closes on Escape', async () => {
    renderAt()
    await openWidget()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('stays out of checkout', () => {
    renderAt('/checkout')
    expect(screen.queryByRole('button', { name: 'Open Oddly Assistant' })).toBeNull()
  })

  it('sends on Enter with the session token, showing a typing state until the reply arrives', async () => {
    let release!: () => void
    handler = routes(() => new Promise((res) => { release = () => res(json(reply({ message: 'Lamps coming up.' }))) }))
    renderAt()
    await openWidget()
    await screen.findByText('Hello from the studio.')
    await sendMessage('Show decorative lamps')
    expect(await screen.findByText('Show decorative lamps')).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Oddly is typing' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true)
    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/api/chat/message'))!
    expect((init!.headers as Record<string, string>)['X-Chat-Token']).toBe('tok-1')
    expect(JSON.parse(String(init!.body))).toEqual({ session_id: SESSION.session_id, message: 'Show decorative lamps' })
    await act(async () => release())
    expect(await screen.findByText('Lamps coming up.')).toBeTruthy()
    expect(screen.queryByRole('status', { name: 'Oddly is typing' })).toBeNull()
  })

  it('sends a suggestion when tapped', async () => {
    renderAt()
    await openWidget()
    fireEvent.click(await screen.findByRole('button', { name: 'Find a gift' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/api/chat/message'))).toBe(true))
  })

  it('renders product cards from the reply', async () => {
    handler = routes(() => json(reply({ type: 'product_recommendations', message: 'Two ideas.', products: [MELT, GHOST] })))
    renderAt()
    await openWidget()
    await sendMessage('vases')
    const rail = await screen.findByRole('list', { name: 'Recommended products' })
    expect(within(rail).getAllByRole('listitem')).toHaveLength(2)
    expect(within(rail).getByText('₹2,490')).toBeTruthy()
    const link = within(rail).getAllByRole('link', { name: 'View product' })[0] as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/product/melt-vase')
    expect((within(rail).getByAltText('Melt Vase') as HTMLImageElement).src).toBe('https://example.com/melt.webp')
  })

  it('renders a comparison table', async () => {
    handler = routes(() => json(reply({ type: 'product_comparison', comparison: {
      products: [MELT, GHOST], rows: [{ label: 'Price', values: ['₹2,490', '₹4,290'] }] } })))
    renderAt()
    await openWidget()
    await sendMessage('compare')
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('rowheader', { name: 'Price' })).toBeTruthy()
    expect(within(table).getByText('₹4,290')).toBeTruthy()
  })

  it('shows an error and lets the shopper retry', async () => {
    let fail = true
    handler = routes(() => (fail ? json({ detail: 'The assistant is having trouble right now.' }, 503) : json(reply({ message: 'Back again.' }))))
    renderAt()
    await openWidget()
    await sendMessage('hello?')
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('The assistant is having trouble right now.')).toBeTruthy()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Not sent. Try again' }))
    expect(await screen.findByText('Back again.')).toBeTruthy()
  })

  it('starts a new conversation when the old one has expired, keeping the message', async () => {
    let calls = 0
    handler = routes(() => (++calls === 1 ? json({ detail: 'expired' }, 410) : json(reply({ message: 'Fresh start.' }))))
    renderAt()
    await openWidget()
    await screen.findByText('Hello from the studio.')
    await sendMessage('lamps')
    expect(await screen.findByText('Fresh start.')).toBeTruthy()
    expect(screen.getByText('lamps')).toBeTruthy()
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/api/chat/sessions'))).toHaveLength(2)
  })

  it('enforces the character limit', async () => {
    renderAt()
    await openWidget()
    const input = await screen.findByLabelText('Message Oddly')
    fireEvent.change(input, { target: { value: 'a'.repeat(601) } })
    expect(screen.getByText('601 / 600')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('sends a custom brief only when the shopper presses send', async () => {
    const enquiry = { name: 'Asha', email: 'asha@example.com', idea: 'A Krishna sculpture with a flute', reference_url: null,
      dimensions: null, colours: [], quantity: null, notes: null, missing: [], errors: [], ready: true, submitted: false, request_id: null }
    handler = routes(() => json(reply({ type: 'custom_enquiry', message: 'Here is your brief.', enquiry })))
    renderAt()
    await openWidget()
    await sendMessage('custom piece please')
    const form = await screen.findByRole('form', { name: 'Custom creation brief' })
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/api/chat/enquiries'))).toBe(false)
    fireEvent.click(within(form).getByRole('button', { name: 'Send brief to the studio' }))
    expect(await screen.findByText('Brief sent to the studio')).toBeTruthy()
    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/api/chat/enquiries'))!
    expect(JSON.parse(String(init!.body))).toMatchObject({ session_id: SESSION.session_id, name: 'Asha', email: 'asha@example.com' })
  })

  it('goes full screen and locks page scroll on phones', async () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ ...original(q), matches: q.includes('max-width') })) as typeof window.matchMedia
    try {
      renderAt()
      const dialog = await openWidget()
      expect(dialog.className).toContain('inset-0')
      expect(dialog.className).toContain('sm:w-[25.5rem]')
      await waitFor(() => expect(scroll.lockScroll).toHaveBeenCalled())
    } finally {
      window.matchMedia = original
    }
  })

  it('sits above the sticky buy bar on product pages', () => {
    renderAt('/product/melt-vase')
    expect(screen.getByRole('button', { name: 'Open Oddly Assistant' }).className).toContain('bottom-[5.5rem]')
  })
})
