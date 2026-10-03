import { Link } from 'react-router-dom'
import { useProductsByIds } from '@/lib/queries'
import { useWishlist } from '@/stores/wishlist'
import { useCart } from '@/stores/cart'
import { useSession } from '@/stores/session'
import { toast } from '@/stores/toast'
import { useDocumentTitle } from '@/lib/hooks'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { ProductCardSkeleton } from '@/components/product/ProductCard'
import { Price } from '@/components/product/Price'

export default function WishlistPage() {
  const ids = useWishlist((s) => s.ids)
  const remove = useWishlist((s) => s.remove)
  const add = useCart((s) => s.add)
  const user = useSession((s) => s.user)
  const { data: products, isLoading } = useProductsByIds(ids)
  useDocumentTitle('Wishlist')
  const list = (products ?? []).filter((p) => ids.includes(p.id))

  return (
    <>
    <PageHeader title="Saved" count={ids.length}
      intro={!user && ids.length > 0 ? <><Link to="/login?next=/wishlist" className="link-draw text-ink">Sign in</Link> to keep your saved pieces on every device.</> : undefined} />
    <Container className="pb-28">
      {ids.length === 0 ? (
        <EmptyState title="Nothing saved yet." body="Select the heart on any piece and it will be kept here for later."
          action={<ButtonLink to="/shop" size="lg">Browse the shop</ButtonLink>} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{ids.map((i) => <ProductCardSkeleton key={i} />)}</div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-14 lg:grid-cols-4 lg:gap-x-8">
          {list.map((p) => {
            const soldOut = p.availability === 'out_of_stock'
            return (
              <li key={p.id} className="flex flex-col">
                <Link to={`/product/${p.slug}`} className="block overflow-hidden bg-ash">
                  <img src={p.images[0]?.url} alt={p.name} className={`aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-105 ${soldOut ? 'opacity-50 grayscale' : ''}`} />
                </Link>
                <Link to={`/product/${p.slug}`} className="mt-4 text-[15px] font-medium text-ink"><span className="link-draw">{p.name}</span></Link>
                <Price price={p.price} compareAt={p.compare_at_price} className="mt-1 font-mono text-[13px] text-fog" />
                <div className="mt-4 flex flex-col gap-2">
                  <Button size="sm" disabled={soldOut} onClick={() => {
                    add(p.id)
                    void remove(p.id)
                    toast(`Moved ${p.name} to your bag`, { action: { label: 'View bag', href: '/cart' } })
                  }}>{soldOut ? 'Sold out' : 'Move to bag'}</Button>
                  <button onClick={() => void remove(p.id)} className="link-draw self-center text-sm text-smoke hover:text-ink">Remove</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Container>
    </>
  )
}
