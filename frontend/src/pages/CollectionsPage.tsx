import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { Planet, Sparkle } from '@/components/scrapbook/Stickers'
import { Skeleton } from '@/components/ui/misc'
import { useCategories } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'
import { plural } from '@/lib/format'

export default function CollectionsPage() {
  const { data: categories, isLoading } = useCategories()
  useDocumentTitle('Collections')
  return (
    <Container className="pt-10 sm:pt-16">
      <header className="relative mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
        <Planet className="absolute -top-6 right-[36%] hidden w-20 rotate-12 lg:block" />
        <Sparkle className="absolute right-[33%] top-12 hidden w-8 lg:block" />
        <h1 className="text-[length:var(--text-title)] font-display leading-[0.95] lg:col-span-8">Collections</h1>
        <p className="max-w-md text-lg text-smoke lg:col-span-4">Grouped loosely, because most of what we make refuses to fit neatly anywhere.</p>
      </header>
      <ul className="border-t border-rule">
        {isLoading && Array.from({ length: 6 }, (_, i) => <li key={i} className="py-6"><Skeleton className="h-16" /></li>)}
        {categories?.map((c) => (
          <li key={c.id} className="border-b border-rule">
            <Link to={`/collections/${c.slug}`} className="group grid items-center gap-4 py-6 sm:grid-cols-12 sm:py-8">
              <div className="aspect-[4/5] w-24 overflow-hidden bg-paper-2 sm:col-span-2 sm:w-full sm:max-w-32">
                {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
              </div>
              <h2 className="text-5xl font-display leading-[0.95] group-hover:text-accent sm:col-span-6 sm:text-7xl">{c.name}</h2>
              <div className="flex flex-col gap-2 sm:col-span-4">
                <p className="text-smoke">{c.description}</p>
                <p className="text-sm tabular-nums text-fog">{plural(c.product_count, 'piece')}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  )
}
