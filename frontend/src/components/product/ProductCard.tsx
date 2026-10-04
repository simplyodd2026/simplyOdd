import { Link } from 'react-router-dom'
import type { Product } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { toast } from '@/stores/toast'
import { cn } from '@/lib/cn'
import { Price } from './Price'
import { WishlistButton } from './WishlistButton'
import { Icon } from '@/components/ui/Icon'

export function ProductCard({ product, className, priority, aspect = 'aspect-[4/5]', showTagline = true }: {
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

  // The wall label's second line: what it's made of and how big it is, the way a gallery captions an object.
  const dims = [product.dimensions.width_cm, product.dimensions.height_cm, product.dimensions.depth_cm]
  const caption = showTagline && product.tagline ? product.tagline
    : dims.every(Boolean) ? `${dims.join(' × ')} cm` : ''

  return (
    <article className={cn('group relative', className)}>
      <Link to={`/product/${product.slug}`} className="block" aria-label={product.name}>
        <div className={cn('relative overflow-hidden rounded-[10px] bg-paper-2', aspect)}>
          {primary && (
            <img src={primary.url} alt={primary.alt || product.name} loading={priority ? 'eager' : 'lazy'} decoding="async"
              className={cn('absolute inset-0 h-full w-full object-cover mix-blend-multiply transition-[opacity,transform] duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.03]',
                secondary && 'group-hover:opacity-0', soldOut && 'opacity-50 grayscale')} />
          )}
          {secondary && (
            <img src={secondary.url} alt="" aria-hidden="true" loading="lazy" decoding="async"
              className="absolute inset-0 h-full w-full scale-[1.06] object-cover opacity-0 mix-blend-multiply transition-[opacity,transform] duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-100 group-hover:opacity-100" />
          )}
          {badge && (
            <span className={cn('absolute left-3 top-3 rounded-full px-2.5 py-1 text-[12px] font-medium',
              soldOut ? 'bg-ink text-paper' : product.discount_percent > 0 ? 'bg-accent text-paper' : 'bg-paper text-ink')}>{badge}</span>
          )}
          {!soldOut && (
            <button onClick={quickAdd}
              className="absolute bottom-3 right-3 hidden h-10 translate-y-3 items-center gap-2 rounded-full bg-ink pl-4 pr-3 text-[13px] font-medium text-paper opacity-0
                transition-[transform,opacity,background-color] duration-500 ease-[var(--ease-out-quint)] hover:bg-accent focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
              aria-label={`Add ${product.name} to bag`}>
              Add to bag <Icon name="plus" size={15} />
            </button>
          )}
        </div>
      </Link>
      <WishlistButton productId={product.id} name={product.name}
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-paper/90 text-ink transition-opacity duration-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" size={16} />

      <div className="mt-3 flex items-start justify-between gap-3 border-t border-ink/70 pt-2.5">
        <div className="min-w-0">
          <Link to={`/product/${product.slug}`} className="block truncate font-display text-[1.2rem] leading-[1.05] text-ink">
            <span className="link-draw">{product.name}</span>
          </Link>
          {caption && <p className="mt-1.5 line-clamp-1 text-[13px] text-fog">{caption}</p>}
          {product.availability === 'low_stock' && <p className="mt-1 text-[13px] text-accent">Only {product.stock} left</p>}
        </div>
        <Price price={product.price} compareAt={product.compare_at_price} className="shrink-0 flex-col items-end gap-0 text-right font-display text-[1.1rem] leading-[1.05] text-ink [&_s]:text-[12px] [&_s]:font-sans [&_s]:normal-case" />
      </div>
      {!soldOut && (
        <button onClick={quickAdd} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-ink/20 text-[13px] text-ink active:bg-ink active:text-paper sm:hidden"
          aria-label={`Add ${product.name} to bag`}>
          <Icon name="plus" size={15} /> Add to bag
        </button>
      )}
    </article>
  )
}

export function ProductCardSkeleton({ aspect = 'aspect-[4/5]' }: { aspect?: string }) {
  return (
    <div>
      <div className={cn('animate-pulse rounded-[10px] bg-ink/[0.06]', aspect)} />
      <div className="mt-4 h-3.5 w-2/3 animate-pulse bg-ink/[0.06]" />
      <div className="mt-2 h-3 w-1/3 animate-pulse bg-ink/[0.06]" />
    </div>
  )
}
