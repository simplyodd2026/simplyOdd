import { Link, useParams } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { ProductResults } from '@/features/catalog/ProductResults'
import { useCatalogParams } from '@/features/catalog/useCatalogParams'
import { useCategories, useProducts } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'
import NotFoundPage from './NotFoundPage'

type Preset = 'all' | 'new' | 'bestseller' | 'category'

const COPY: Record<Exclude<Preset, 'category'>, { title: string; intro: string }> = {
  all: { title: 'The shop', intro: 'Every object we currently make, from lighting to desk pieces. Each is made to order and finished by hand.' },
  new: { title: 'New arrivals', intro: 'The most recent pieces from the studio, released in small first batches.' },
  bestseller: { title: 'Best sellers', intro: 'The pieces customers return to most, and most often choose as gifts.' },
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
    <>
      <PageHeader key={copy.title}
        trail={<><Link to="/" className="link-draw hover:text-ink">Home</Link><span>/</span>
          {preset === 'category' ? <><Link to="/collections" className="link-draw hover:text-ink">Collections</Link><span>/</span><span className="text-ink">{copy.title}</span></>
            : <span className="text-ink">{copy.title}</span>}</>}
        title={copy.title || ' '} count={data?.total} intro={copy.intro} />
      <Container>
        <ProductResults params={params} data={data} isLoading={isLoading || (preset === 'category' && catsLoading)} isFetching={isFetching}
          showCategories={preset !== 'category'}
          empty={<EmptyState title="Nothing matches those filters." body="Widen the price range or include pieces that are currently sold out."
            action={params.activeCount ? <button onClick={params.clear} className="link-draw text-ink">Clear filters</button>
              : <ButtonLink to="/shop">Browse everything</ButtonLink>} />} />
      </Container>
    </>
  )
}
