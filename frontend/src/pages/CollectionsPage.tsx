import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { CategoryIndex } from '@/features/home/CategoryIndex'
import { useCategories } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'

export default function CollectionsPage() {
  const { data: categories } = useCategories()
  useDocumentTitle('Collections')
  return (
    <>
      <PageHeader trail={<><Link to="/" className="link-draw hover:text-ink">Home</Link><span>/</span><span className="text-ink">Collections</span></>}
        title="Collections" count={categories?.length}
        intro="Our pieces, grouped by where they live: on a shelf, a desk, a side table or hanging from the ceiling." />
      <Container className="pb-28 sm:pb-40">
        <CategoryIndex large showDescriptions />
      </Container>
    </>
  )
}
