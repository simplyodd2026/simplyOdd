import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { toast } from '@/stores/toast'
import { money } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

export function BoughtTogether({ product, others }: { product: Product; others: Product[] }) {
  const [selected, setSelected] = useState<string[]>(others.map((p) => p.id))
  const add = useCart((s) => s.add)
  if (!others.length || product.availability === 'out_of_stock') return null
  const all = [product, ...others.filter((p) => selected.includes(p.id))]
  const total = all.reduce((n, p) => n + p.price, 0)

  return (
    <section className="border-t border-rule py-10">
      <h2 className="mb-8 text-[length:var(--text-heading)] font-display leading-none">Often bought together</h2>
      <div className="grid items-center gap-8 lg:grid-cols-12">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none sm:gap-4 lg:col-span-8">
          {[product, ...others].map((p, i) => {
            const on = i === 0 || selected.includes(p.id)
            return (
              <div key={p.id} className="flex shrink-0 items-center gap-2 sm:gap-4">
                {i > 0 && <Icon name="plus" className="text-fog" />}
                <div className={cn('w-28 transition-opacity sm:w-40', !on && 'opacity-35')}>
                  <Link to={`/product/${p.slug}`} className="block bg-ash"><img src={p.images[0]?.url} alt={p.name} className="aspect-[4/5] w-full object-cover" /></Link>
                  <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5 accent-accent" disabled={i === 0} checked={on}
                      onChange={() => setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))} />
                    <span><span className="block font-medium leading-tight">{i === 0 ? `This: ${p.name}` : p.name}</span>
                      <span className="tabular-nums text-smoke">{money(p.price)}</span></span>
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-3 lg:col-span-4">
          <p className="text-smoke">Total for {all.length === 1 ? 'this piece' : `all ${all.length}`}</p>
          <p className="text-3xl font-semibold tabular-nums">{money(total)}</p>
          <Button size="lg" onClick={() => {
            all.forEach((p) => add(p.id))
            toast(`Added ${all.length} ${all.length === 1 ? 'piece' : 'pieces'} to your bag`, { action: { label: 'View bag', href: '/cart' } })
          }}>
            Add {all.length === 1 ? 'to bag' : `all ${all.length} to bag`}
          </Button>
        </div>
      </div>
    </section>
  )
}
