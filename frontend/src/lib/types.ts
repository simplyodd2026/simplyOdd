export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface ProductImage { url: string; path?: string | null; alt: string }
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
  stock: number
  category_id: string | null
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
  rating: RatingSummary
  sales_count: number
  discount_percent: number
  availability: Availability
  created_at: string
  updated_at: string
}

export type ProductInput = Omit<Product, 'id' | 'rating' | 'sales_count' | 'discount_percent' | 'availability' | 'created_at' | 'updated_at' | 'slug'> & { slug?: string | null }

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

export interface CartLine { product_id: string; quantity: number }
export interface Cart { items: CartLine[] }
export type ShippingMethod = 'standard' | 'express'

export interface QuoteLine {
  product_id: string
  name: string
  slug: string
  image: string | null
  unit_price: number
  compare_at_price: number | null
  quantity: number
  line_total: number
  stock: number
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
  shipping_method: ShippingMethod
  shipping: number
  shipping_options: ShippingOption[]
  tax: number
  tax_rate: number
  total: number
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
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refund_pending' | 'refunded' | 'cod_due' | 'void'

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
  tax: number
  total: number
  currency: string
  status: OrderStatus
  history: { status: OrderStatus; at: string; note: string | null; by: string | null }[]
  payment: {
    provider: string
    status: PaymentStatus
    reference: string | null
    transaction_id: string | null
    amount: number
    currency: string
    paid_at: string | null
    refund_reference: string | null
  }
  tracking_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CheckoutResponse { order: Order; payment: { provider: string } & Record<string, unknown> }

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
  tax_rate: number
  free_shipping_threshold: number
  payment_providers: PaymentProviderInfo[]
}

export interface Coupon {
  id: string
  code: string
  description: string
  kind: 'percent' | 'fixed' | 'free_shipping'
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
  low_stock: { id: string; name: string; stock: number }[]
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
