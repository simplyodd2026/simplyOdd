import { Link } from 'react-router-dom'
import type { Product } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { toast } from '@/stores/toast'
import { cn } from '@/lib/cn'
import { Price } from './Price'
import { WishlistButton } from './WishlistButton'
import { Icon } from '@/components/ui/Icon'

export function ProductCard({ product, className, priority, size = 'md' }: {
  product: Product; className?: string; priority?: boolean; size?: 'md' | 'lg'
}) {
  const add = useCart((s) => s.add)
  const soldOut = product.availability === 'out_of_stock'
  const [primary, secondary] = product.images

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    add(product.id)
    toast(`Added ${product.name} to your bag`, { action: { label: 'View bag', href: '/cart' } })
  }

  return (
    <article className={cn('group relative', className)}>
      <Link to={`/product/${product.slug}`} className="block" aria-label={product.name}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-ash">
          {primary && (
            <img src={primary.url} alt={primary.alt || product.name} loading={priority ? 'eager' : 'lazy'} decoding="async"
              className={cn('absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.03]',
                secondary && 'group-hover:opacity-0', soldOut && 'opacity-50 grayscale')} />
          )}
          {secondary && (
            <img src={secondary.url} alt="" aria-hidden="true" loading="lazy" decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-500 group-hover:scale-[1.03] group-hover:opacity-100" />
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {soldOut ? (
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">Sold out</span>
            ) : product.discount_percent > 0 ? (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold tabular-nums text-paper">−{product.discount_percent}%</span>
            ) : product.is_new_arrival ? (
              <span className="-rotate-3 rounded-full bg-paper px-3 py-1 text-xs font-bold text-accent shadow-sm">New!</span>
            ) : null}
          </div>
          {!soldOut && (
            <button onClick={quickAdd}
              className="absolute inset-x-3 bottom-3 hidden h-11 translate-y-2 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-paper
                opacity-0 transition-all duration-300 hover:bg-accent focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
              aria-label={`Add ${product.name} to bag`}>
              <Icon name="plus" size={16} /> Add to bag
            </button>
          )}
        </div>
      </Link>
      <WishlistButton productId={product.id} name={product.name}
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-paper text-ink shadow-sm" size={18} />
      <div className="flex items-start justify-between gap-3 px-1 pt-3">
        <div className="min-w-0">
          <Link to={`/product/${product.slug}`} className={cn('block font-semibold leading-tight text-ink w-semi hover:text-accent',
            size === 'lg' ? 'text-xl' : 'text-[17px]')}>
            {product.name}
          </Link>
          <Price price={product.price} compareAt={product.compare_at_price} className="mt-1 text-[15px] text-ink" />
          {product.availability === 'low_stock' && <p className="mt-1 text-sm font-medium text-accent">Only {product.stock} left</p>}
        </div>
        {!soldOut && (
          <button onClick={quickAdd} className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-paper hover:bg-accent sm:hidden"
            aria-label={`Add ${product.name} to bag`}>
            <Icon name="plus" size={18} />
          </button>
        )}
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="aspect-[4/5] animate-pulse rounded-3xl bg-black/[0.06]" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-black/[0.06]" />
      <div className="mt-2 h-4 w-1/4 animate-pulse bg-black/[0.06]" />
    </div>
  )
}
