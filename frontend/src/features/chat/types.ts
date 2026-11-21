/** Mirrors backend/app/models/chat.py. */
export type ReplyType =
  | 'text' | 'product_recommendations' | 'product_comparison' | 'faq' | 'custom_enquiry' | 'order_status' | 'error'

export interface ChatProduct {
  id: string
  slug: string
  name: string
  price: number
  compare_at_price: number | null
  /** The piece comes in versions at different prices; `price` is the default version's. */
  price_varies: boolean
  image: string | null
  url: string
  summary: string
}

export interface Comparison {
  products: ChatProduct[]
  rows: { label: string; values: string[] }[]
}

export interface EnquiryDraft {
  name: string | null
  email: string | null
  idea: string | null
  reference_url: string | null
  dimensions: string | null
  colours: string[]
  quantity: number | null
  notes: string | null
  missing: string[]
  errors: string[]
  ready: boolean
  submitted: boolean
  request_id: string | null
}

export interface OrderSummary {
  id: string
  number: string
  status: string
  status_label: string
  total: number
  currency: string
  created_at: string
  tracking_number: string | null
  items: { name: string; quantity: number }[]
  url: string
}

/** The structured part of a reply; also what history returns as `payload`. */
export interface ReplyPayload {
  type?: ReplyType
  products?: ChatProduct[]
  comparison?: Comparison | null
  faq?: { question: string; answer: string }[]
  enquiry?: EnquiryDraft | null
  orders?: OrderSummary[]
  suggestions?: string[]
  fallback?: boolean
}

export interface ChatReply extends ReplyPayload {
  session_id: string
  message_id: string | null
  type: ReplyType
  message: string
}

export interface SessionOut {
  session_id: string
  token: string
  expires_at: string
  greeting: string
  suggestions: string[]
}

export interface HistoryMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type: ReplyType
  payload: ReplyPayload
  created_at: string
}

/** One bubble in the conversation as the widget holds it. */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type: ReplyType
  payload: ReplyPayload
  /** Server id of an assistant message, for feedback. */
  messageId?: string | null
  feedback?: 'up' | 'down'
  /** A user message that didn't go through; offered for retry. */
  failed?: boolean
}

export const MAX_CHARS = 600
