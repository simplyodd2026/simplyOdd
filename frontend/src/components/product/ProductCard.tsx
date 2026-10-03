import { Link } from 'react-router-dom'
import type { Product } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { toast } from '@/stores/toast'
import { cn } from '@/lib/cn'
import { Price } from './Price'
import { WishlistButton } from './WishlistButton'
import { Icon } from '@/components/ui/Icon'

export function ProductCard({ product, className, priority, index, aspect = 'aspect-[4/5]', showTagline = true }: {
  product: Product; className?: string; priority?: boolean; index?: number; aspect?: string; showTagline?: boolean
  size?: 'md' | 'lg'
}) {
  const add = useCart((s) => s.add)
  const soldOut = product.availability === 'out_of_stock'
  const [primary, secondary] = product.images
  const badge = soldOut ? 'Sold out' : product.discount_percent > 0 ? `−${product.discount_percent}%` : product.is_new_arrival ? 'New' : null

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    add(product.id)
    toast(`${product.name} added to your bag`, { action: { label: 'View bag', href: '/cart' } })
  }

  return (
    <article className={cn('group relative', className)}>
      <Link to={`/product/${product.slug}`} className="block" aria-label={product.name}>
        <div className={cn('relative overflow-hidden rounded-lg bg-ash transition-shadow duration-700 group-hover:shadow-[0_24px_40px_-24px_rgb(155_44_44/0.35)]', aspect)}>
          {primary && (
            <img src={primary.url} alt={primary.alt || product.name} loading={priority ? 'eager' : 'lazy'} decoding="async"
              className={cn('absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]',
                secondary && 'group-hover:opacity-0', soldOut && 'opacity-60 grayscale')} />
          )}
          {secondary && (
            <img src={secondary.url} alt="" aria-hidden="true" loading="lazy" decoding="async"
              className="absolute inset-0 h-full w-full scale-[1.08] object-cover opacity-0 transition-[opacity,transform] duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-100 group-hover:opacity-100" />
          )}
          <div className="absolute inset-x-3 top-3 flex items-start justify-between">
            {index !== undefined
              ? <span className="font-mono text-[11px] text-ink/60">{String(index).padStart(2, '0')}</span>
              : <span />}
            {badge && <span className={cn('label rounded-full px-2.5 py-1 text-[10px]', soldOut ? 'bg-ink text-paper' : product.discount_percent > 0 ? 'bg-hot text-paper' : 'bg-sun text-ink')}>{badge}</span>}
          </div>
          {!soldOut && (
            <button onClick={quickAdd}
              className="absolute inset-x-3 bottom-3 hidden h-11 translate-y-[140%] items-center justify-between rounded-full bg-paper px-5 text-[13px] font-medium text-ink
                transition-[transform,background-color,color] duration-700 ease-[var(--ease-out-quint)] hover:bg-ink hover:text-paper focus-visible:translate-y-0 group-hover:translate-y-0 sm:flex"
              aria-label={`Add ${product.name} to bag`}>
              Add to bag <Icon name="plus" size={16} />
            </button>
          )}
        </div>
      </Link>
      <WishlistButton productId={product.id} name={product.name}
        className={cn('absolute right-3 grid size-9 place-items-center rounded-full bg-paper/90 text-ink transition-opacity duration-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
          badge ? 'top-12' : 'top-3')} size={17} />
      <div className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0">
          <Link to={`/product/${product.slug}`} className="block truncate text-[15px] font-medium leading-snug text-ink">
            <span className="link-draw">{product.name}</span>
          </Link>
          {showTagline && product.tagline && <p className="mt-1 line-clamp-1 text-[13px] text-fog">{product.tagline}</p>}
          {product.availability === 'low_stock' && <p className="mt-1 text-[13px] text-accent">Only {product.stock} left</p>}
        </div>
        <Price price={product.price} compareAt={product.compare_at_price} className="shrink-0 font-mono text-[13px] text-ink" />
      </div>
      {!soldOut && (
        <button onClick={quickAdd} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-ink/15 text-[13px] text-ink active:bg-ink active:text-paper sm:hidden"
          aria-label={`Add ${product.name} to bag`}>
          <Icon name="plus" size={15} /> Add
        </button>
      )}
    </article>
  )
}

export function ProductCardSkeleton({ aspect = 'aspect-[4/5]' }: { aspect?: string }) {
  return (
    <div>
      <div className={cn('animate-pulse bg-ink/[0.06]', aspect)} />
      <div className="mt-4 h-3.5 w-2/3 animate-pulse bg-ink/[0.06]" />
      <div className="mt-2 h-3 w-1/3 animate-pulse bg-ink/[0.06]" />
    </div>
  )
}
