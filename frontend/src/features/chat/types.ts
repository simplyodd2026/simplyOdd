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

/** The shop page listing everything a chat search matched, with the same filters. */
export interface ExploreLink {
  url: string
  label: string
  total: number
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

/** The structured part of a reply. */
export interface ReplyPayload {
  type?: ReplyType
  products?: ChatProduct[]
  explore?: ExploreLink | null
  comparison?: Comparison | null
  faq?: { question: string; answer: string }[]
  enquiry?: EnquiryDraft | null
  orders?: OrderSummary[]
  suggestions?: string[]
  fallback?: boolean
}

export interface ChatReply extends ReplyPayload {
  session_id: string
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

/** One bubble in the conversation as the widget holds it. */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type: ReplyType
  payload: ReplyPayload
  /** A user message that didn't go through; offered for retry. */
  failed?: boolean
}

export const MAX_CHARS = 600
