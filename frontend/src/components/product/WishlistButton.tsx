import { useWishlist } from '@/stores/wishlist'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

export function WishlistButton({ productId, name, className, size = 20 }: {
  productId: string; name: string; className?: string; size?: number
}) {
  const saved = useWishlist((s) => s.ids.includes(productId))
  const toggle = useWishlist((s) => s.toggle)
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggle(productId, name) }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={cn('transition-colors', saved ? 'text-accent' : 'hover:text-accent', className)}
    >
      <Icon name="heart" size={size} filled={saved} />
    </button>
  )
}
