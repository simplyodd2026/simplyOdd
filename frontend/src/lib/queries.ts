import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, qs } from './api'
import type {
  Category, CartLine, Homepage, Order, Page, Product, ProductDetail, Quote, Review, ReviewEligibility, ReviewWithProduct, ShippingMethod,
  SortKey, StorefrontConfig, UserProfile,
} from './types'
import { useSession } from '@/stores/session'

export interface ProductQuery {
  q?: string
  category?: string
  min_price?: number
  max_price?: number
  in_stock?: boolean
  flag?: 'featured' | 'bestseller' | 'new'
  sort?: SortKey
  page?: number
  page_size?: number
  track?: boolean
}

export const useProducts = (params: ProductQuery, enabled = true) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: ({ signal }) => api<Page<Product>>(`/products${qs({ ...params })}`, { signal, auth: false }),
    placeholderData: keepPreviousData,
    enabled,
  })

export const useHomepage = () =>
  useQuery({ queryKey: ['homepage'], queryFn: () => api<Homepage>('/homepage', { auth: false }), staleTime: 5 * 60_000 })

export const useProductsByIds = (ids: string[]) =>
  useQuery({
    queryKey: ['products-by-ids', ids],
    queryFn: () => api<Product[]>(`/products/by-ids${qs({ ids: ids.join(',') })}`, { auth: false }),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  })

export const useProduct = (slug: string) =>
  useQuery({
    queryKey: ['product', slug],
    queryFn: () => api<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { auth: false }),
  })

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories', { auth: false }), staleTime: 5 * 60_000 })

export const useConfig = () =>
  useQuery({ queryKey: ['config'], queryFn: () => api<StorefrontConfig>('/config', { auth: false }), staleTime: Infinity })

export const useQuote = (items: CartLine[], coupon: string | null, shipping: ShippingMethod) =>
  useQuery({
    queryKey: ['quote', items, coupon, shipping],
    queryFn: () => api<Quote>('/cart/quote', { body: { items, coupon_code: coupon, shipping_method: shipping }, auth: false }),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
  })

export const useReviews = (productId: string | undefined) =>
  useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => api<Review[]>(`/products/${productId}/reviews`, { auth: false }),
    enabled: !!productId,
  })

export const useReviewEligibility = (productId: string | undefined) => {
  const uid = useSession((s) => s.user?.uid)
  return useQuery({
    queryKey: ['review-eligibility', productId, uid],
    queryFn: () => api<ReviewEligibility>(`/products/${productId}/reviews/eligibility`),
    enabled: !!productId && !!uid,
  })
}

export const useMyOrders = () => {
  const uid = useSession((s) => s.user?.uid)
  return useQuery({ queryKey: ['my-orders', uid], queryFn: () => api<Order[]>('/me/orders'), enabled: !!uid })
}

export const useMyOrder = (id: string) => {
  const uid = useSession((s) => s.user?.uid)
  return useQuery({ queryKey: ['my-order', id], queryFn: () => api<Order>(`/me/orders/${id}`), enabled: !!uid })
}

export const useSuggestions = (q: string) =>
  useQuery({
    queryKey: ['suggest', q],
    queryFn: ({ signal }) =>
      api<{ products: Product[]; categories: Category[]; tags: string[] }>(`/search/suggest${qs({ q })}`, { signal, auth: false }),
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const useRecentReviews = (limit = 8) =>
  useQuery({ queryKey: ['recent-reviews', limit], queryFn: () => api<ReviewWithProduct[]>(`/reviews/recent${qs({ limit })}`, { auth: false }), staleTime: 5 * 60_000 })

export const usePopularSearches = () =>
  useQuery({ queryKey: ['popular-searches'], queryFn: () => api<string[]>('/search/popular', { auth: false }), staleTime: 5 * 60_000 })

export const refreshProfile = async () => {
  const profile = await api<UserProfile>('/me')
  useSession.getState().set({ profile })
  return profile
}
