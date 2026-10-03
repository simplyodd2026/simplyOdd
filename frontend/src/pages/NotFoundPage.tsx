import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { SplitReveal, Reveal } from '@/components/motion/Reveal'
import { useDocumentTitle } from '@/lib/hooks'

export default function NotFoundPage() {
  useDocumentTitle('Not found')
  return (
    <Container className="grid min-h-[70vh] content-center gap-10 py-24 lg:grid-cols-12">
      <p className="label text-fog lg:col-span-3">Error 404</p>
      <div className="lg:col-span-9">
        <SplitReveal as="h1" on="load" className="font-display text-[length:var(--text-title)] leading-[0.92] text-ink">
          This page could not be found.
        </SplitReveal>
        <Reveal delay={0.3} className="mt-10 flex flex-wrap items-center gap-8">
          <ButtonLink to="/shop" size="lg">Browse the shop</ButtonLink>
          <ArrowLink to="/">Return home</ArrowLink>
        </Reveal>
      </div>
    </Container>
  )
}
