import { Link } from 'react-router-dom'
import { useProductsByIds } from '@/lib/queries'
import { useWishlist } from '@/stores/wishlist'
import { useCart } from '@/stores/cart'
import { useSession } from '@/stores/session'
import { toast } from '@/stores/toast'
import { useDocumentTitle } from '@/lib/hooks'
import { Container } from '@/components/layout/Container'
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
    <Container className="pt-10 sm:pt-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-[length:var(--text-title)] font-display leading-[0.95]">Wishlist</h1>
        {!user && ids.length > 0 && (
          <p className="max-w-sm text-smoke"><Link to="/login?next=/wishlist" className="text-ink underline underline-offset-4">Sign in</Link> to keep your wishlist on every device.</p>
        )}
      </header>
      {ids.length === 0 ? (
        <EmptyState title="Nothing saved yet." body="Tap the heart on anything you like and it will wait for you here."
          action={<ButtonLink to="/shop" variant="light">Browse the shop</ButtonLink>} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{ids.map((i) => <ProductCardSkeleton key={i} />)}</div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4">
          {list.map((p) => {
            const soldOut = p.availability === 'out_of_stock'
            return (
              <li key={p.id} className="flex flex-col">
                <Link to={`/product/${p.slug}`} className="block bg-ash">
                  <img src={p.images[0]?.url} alt={p.name} className={`aspect-[4/5] w-full object-cover ${soldOut ? 'opacity-50 grayscale' : ''}`} />
                </Link>
                <Link to={`/product/${p.slug}`} className="mt-3 text-[17px] font-semibold w-semi hover:text-accent">{p.name}</Link>
                <Price price={p.price} compareAt={p.compare_at_price} className="text-smoke" />
                <div className="mt-4 flex flex-col gap-2">
                  <Button size="sm" disabled={soldOut} onClick={() => {
                    add(p.id)
                    void remove(p.id)
                    toast(`Moved ${p.name} to your bag`, { action: { label: 'View bag', href: '/cart' } })
                  }}>{soldOut ? 'Sold out' : 'Move to bag'}</Button>
                  <button onClick={() => void remove(p.id)} className="text-sm text-smoke underline-offset-4 hover:text-ink hover:underline">Remove</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Container>
  )
}
