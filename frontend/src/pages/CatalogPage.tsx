import { useParams } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { Planet, Sparkle } from '@/components/scrapbook/Stickers'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { ProductResults } from '@/features/catalog/ProductResults'
import { useCatalogParams } from '@/features/catalog/useCatalogParams'
import { useCategories, useProducts } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'
import NotFoundPage from './NotFoundPage'

type Preset = 'all' | 'new' | 'bestseller' | 'category'

const COPY: Record<Exclude<Preset, 'category'>, { title: string; intro: string }> = {
  all: { title: 'Everything', intro: 'Every object we currently make. Printed to order, finished by hand.' },
  new: { title: 'New arrivals', intro: 'The latest pieces out of the studio. Some of these were sketches a month ago.' },
  bestseller: { title: 'Best sellers', intro: 'The objects people keep coming back for, and keep gifting to each other.' },
}

export default function CatalogPage({ preset }: { preset: Preset }) {
  const { slug } = useParams()
  const params = useCatalogParams(preset === 'bestseller' ? 'popular' : 'newest')
  const { data: categories, isLoading: catsLoading } = useCategories()
  const category = preset === 'category' ? categories?.find((c) => c.slug === slug) : undefined

  const flag = preset === 'new' ? 'new' : preset === 'bestseller' ? 'bestseller' : undefined
  const { data, isLoading, isFetching } = useProducts({
    category: preset === 'category' ? slug : params.category,
    flag, min_price: params.min_price, max_price: params.max_price, in_stock: params.in_stock,
    sort: params.sort, page: params.page, page_size: 12,
  }, preset !== 'category' || !!category)

  const copy = preset === 'category' ? { title: category?.name ?? '', intro: category?.description ?? '' } : COPY[preset]
  useDocumentTitle(copy.title || 'Shop')

  if (preset === 'category' && !catsLoading && !category) return <NotFoundPage />

  return (
    <Container className="pt-10 sm:pt-16">
      <header className="relative mb-10 grid gap-6 sm:mb-14 lg:grid-cols-12 lg:items-end">
        <Planet className="absolute -top-6 right-[36%] hidden w-20 rotate-12 lg:block" />
        <Sparkle className="absolute right-[33%] top-12 hidden w-8 lg:block" />
        <h1 className="text-[length:var(--text-title)] font-display leading-[0.95] lg:col-span-8">{copy.title || ' '}</h1>
        <p className="max-w-md text-lg text-smoke text-pretty lg:col-span-4">{copy.intro}</p>
      </header>
      <ProductResults params={params} data={data} isLoading={isLoading || (preset === 'category' && catsLoading)} isFetching={isFetching}
        showCategories={preset !== 'category'}
        empty={<EmptyState title="Nothing matches those filters." body="Widen the price range or include sold-out pieces."
          action={params.activeCount ? <button onClick={params.clear} className="text-ink underline underline-offset-4 hover:text-accent">Clear filters</button>
            : <ButtonLink to="/shop" variant="light">Browse everything</ButtonLink>} />} />
    </Container>
  )
}
