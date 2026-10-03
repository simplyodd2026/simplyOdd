import { motion } from 'motion/react'
import { useWishlist } from '@/stores/wishlist'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

export function WishlistButton({ productId, name, className, size = 20 }: {
  productId: string; name: string; className?: string; size?: number
}) {
  const saved = useWishlist((s) => s.ids.includes(productId))
  const toggle = useWishlist((s) => s.toggle)
  return (
    <button type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggle(productId, name) }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      className={cn('transition-colors', saved ? 'text-accent' : 'hover:text-accent', className)}>
      <motion.span key={String(saved)} className="grid" initial={{ scale: saved ? 0.6 : 1 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
        <Icon name="heart" size={size} filled={saved} />
      </motion.span>
    </button>
  )
}
