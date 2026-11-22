/**
 * `color` tags a photo as showing a particular filament, so choosing that colour can show it; `variant` tags it
 * as showing one version of the piece (say, the framed one), so choosing that version shows it.
 */
export interface ProductImage { url: string; path?: string | null; alt: string; color?: string | null; variant?: string | null }

export type FilamentGroup = 'essential' | 'extended' | 'special'
/** solid is a flat colour; the others are looks a flat swatch can't show, drawn as textures over `hex`. */
export type FilamentFinish = 'solid' | 'transparent' | 'translucent' | 'silk'
export interface Filament { id: string; name: string; group: FilamentGroup; finish: FilamentFinish; finish_label: string; hex: string }
/** The chosen filament as recorded on a quote line or order item. */
export interface FilamentChoice { id: string; name: string; finish: FilamentFinish; finish_label: string; hex: string }
/** Something the shopper writes on a made-to-order piece, like the name on a keychain. */
export interface PersonalizationField { key: string; label: string; placeholder: string; max_length: number; required: boolean }
/** Values by field key. */
export type Personalization = Record<string, string>
/** A filled-in field with its label, as recorded on a quote line or order item. */
export interface PersonalizationValue { key: string; label: string; value: string }
/** One version of a piece at its own price, like a print "Without frame" or "With frame". */
export interface ProductVariant { key: string; label: string; price: number; compare_at_price?: number | null }
export interface Dimensions { width_cm?: number | null; height_cm?: number | null; depth_cm?: number | null }
export interface RatingSummary { average: number; count: number; distribution: Record<string, number> }

export interface Product {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  price: number
  compare_at_price: number | null
  /** Every category the piece appears in; the first is its home (breadcrumbs, "more like this"). */
  category_ids: string[]
  tags: string[]
  materials: string[]
  dimensions: Dimensions
  weight_g: number | null
  manufacturing: string
  images: ProductImage[]
  is_featured: boolean
  is_bestseller: boolean
  is_new_arrival: boolean
  is_published: boolean
  frequently_bought_with: string[]
  /** Filament ids this piece is offered in; empty means it comes as pictured. */
  colors: string[]
  default_color: string | null
  /** What the shopper writes on the piece; empty means it isn't personalised. */
  personalization: PersonalizationField[]
  /** Added to the price when any field is filled in. */
  personalization_fee: number
  /** What the choice between variants is called, like "Frame". */
  variant_label: string
  /** Versions at their own price; empty means one version at `price`. When set, `price` mirrors the default. */
  variants: ProductVariant[]
  default_variant: string | null
  rating: RatingSummary
  sales_count: number
  discount_percent: number
  created_at: string
  updated_at: string
}

export type ProductInput = Omit<Product, 'id' | 'rating' | 'sales_count' | 'discount_percent' | 'created_at' | 'updated_at' | 'slug'> & { slug?: string | null }

export interface Category {
  id: string
  slug: string
  name: string
  description: string
  image: string | null
  position: number
  product_count: number
}

export interface Page<T> { items: T[]; total: number; page: number; page_size: number; pages: number }

export type SortKey = 'relevance' | 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'rating'

export interface ProductDetail {
  product: Product
  category: Category | null
  related: Product[]
  frequently_bought: Product[]
}

/** One line per product, variant, colour and personalisation. */
export interface CartLine { product_id: string; quantity: number; variant?: string | null; color?: string | null; personalization?: Personalization | null }
export interface Cart { items: CartLine[] }
export type ShippingMethod = 'standard' | 'express'

export interface QuoteLine {
  product_id: string
  /** The filament id as sent, so the line can be matched back to the bag. */
  color: string | null
  filament: FilamentChoice | null
  /** The variant key as sent, so the line can be matched back to the bag. */
  variant: string | null
  /** The chosen variant's name, like "With frame", when it's valid. */
  variant_label: string | null
  /** What the choice is called, like "Frame". */
  variant_name: string
  /** What the piece comes in, for changing the choice from the bag. */
  variants: ProductVariant[]
  /** As sent, so the line can be matched back to the bag. */
  personalization: Personalization | null
  personalization_details: PersonalizationValue[]
  /** What the piece asks the shopper to write, for editing from the bag. */
  personalization_fields: PersonalizationField[]
  personalization_fee: number
  /** What the product can be printed in, for changing the choice from the bag. */
  colors: string[]
  name: string
  slug: string
  image: string | null
  unit_price: number
  compare_at_price: number | null
  quantity: number
  line_total: number
  available: boolean
  issue: string | null
}

export interface ShippingOption { method: ShippingMethod; label: string; eta: string; fee: number }

export interface Quote {
  lines: QuoteLine[]
  subtotal: number
  discount: number
  coupon_code: string | null
  coupon_message: string | null
  /** The code lets the shopper choose what they pay: ask for an amount. */
  coupon_needs_amount: boolean
  coupon_amount: number | null
  shipping_method: ShippingMethod
  shipping: number
  shipping_options: ShippingOption[]
  total: number
  /** Paid online up front on the partial plan. */
  deposit: number
  /** How this bag may be paid: ['partial'] when it holds a personalised piece, else ['full', 'cod']. */
  payment_plans: PaymentPlan[]
  /** Added to the total if the bag is paid cash on delivery. */
  cod_fee: number
  currency: string
  item_count: number
  has_issues: boolean
}

export interface AddressInput {
  label: string
  full_name: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
}
export interface Address extends AddressInput { id: string }

export interface UserProfile {
  user_id: string
  name: string
  email: string
  phone: string
  profile_image: string | null
  addresses: Address[]
  is_admin: boolean
  created_at: string
  updated_at: string
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'shipped'
  | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'partially_paid' | 'failed' | 'refund_pending' | 'refunded' | 'cod_due' | 'void'
/** full: the whole total online. partial: 50% online now, the rest on delivery. cod: all of it on delivery. */
export type PaymentPlan = 'full' | 'partial' | 'cod'

export interface ShippingAddress {
  full_name: string
  phone: string
  email: string
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface OrderItem {
  product_id: string
  color?: string | null
  filament?: FilamentChoice | null
  variant?: string | null
  variant_label?: string | null
  personalization?: Personalization | null
  personalization_details?: PersonalizationValue[]
  name: string
  slug: string
  image: string | null
  unit_price: number
  quantity: number
  line_total: number
}

export interface Order {
  id: string
  number: string
  user_id: string
  email: string
  items: OrderItem[]
  address: ShippingAddress
  shipping_method: ShippingMethod
  subtotal: number
  discount: number
  coupon_code: string | null
  shipping: number
  /** Cash-on-delivery charge, already included in total. */
  cod_fee: number
  total: number
  currency: string
  status: OrderStatus
  history: { status: OrderStatus; at: string; note: string | null; by: string | null }[]
  payment: {
    provider: string
    status: PaymentStatus
    plan: PaymentPlan
    reference: string | null
    transaction_id: string | null
    /** Charged online at checkout. */
    amount: number
    /** Collected on delivery (partial plan). */
    balance: number
    currency: string
    paid_at: string | null
    refund_reference: string | null
  }
  tracking_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CheckoutResponse { order: Order; payment: { provider: string; reference: string } & Record<string, unknown> }

export interface Review {
  id: string
  product_id: string
  user_id: string
  author_name: string
  rating: number
  title: string
  body: string
  verified: boolean
  created_at: string
  updated_at: string
}
export interface ReviewWithProduct extends Review { product_name: string; product_slug: string; product_image: string | null }
export interface ReviewEligibility { can_review: boolean; reason: string | null; existing_review_id: string | null }

export interface PaymentProviderInfo { id: string; label: string; description: string }
export interface StorefrontConfig {
  currency: string
  free_shipping_threshold: number
  standard_shipping_fee: number
  express_shipping_fee: number
  payment_providers: PaymentProviderInfo[]
  filaments: Filament[]
}

export interface Coupon {
  id: string
  code: string
  description: string
  /** custom_total: the shopper enters the order total; `value` is the lowest they may enter. */
  kind: 'percent' | 'fixed' | 'free_shipping' | 'custom_total'
  value: number
  min_subtotal: number
  max_discount: number | null
  usage_limit: number | null
  starts_at: string | null
  expires_at: string | null
  active: boolean
  used_count: number
  created_at: string
}

export interface CustomerRow {
  user_id: string
  name: string
  email: string
  phone: string
  created_at: string
  order_count: number
  total_spent: number
  last_order_at: string | null
  is_admin: boolean
}

export interface Dashboard {
  period_days: number
  revenue: number
  orders: number
  average_order_value: number
  customers: number
  to_fulfil: number
  status_counts: Record<string, number>
  revenue_series: { date: string; revenue: number }[]
  top_products: { product_id: string; name: string; units: number; revenue: number }[]
  recent_orders: Pick<Order, 'id' | 'number' | 'email' | 'total' | 'status' | 'created_at'>[]
}

/** A product placed on the home page, optionally with a particular photo (any image URL). */
export interface HomeSlot { product_id: string; image?: string | null }
export interface HomepageLayout {
  spotlight: HomeSlot | null
  spotlight_inset: string | null
  collection: HomeSlot[]
  collection_row: HomeSlot[]
  room: HomeSlot | null
  moodboard: HomeSlot[]
  studio_image: string | null
  updated_at?: string | null
}
export interface Homepage { layout: HomepageLayout; products: Product[] }
