import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { useDocumentTitle } from '@/lib/hooks'

export default function NotFoundPage() {
  useDocumentTitle('Not found')
  return (
    <Container className="py-24 sm:py-32">
      <p className="text-[length:var(--text-display)] font-black leading-[0.85] text-accent w-wide">404</p>
      <h1 className="mt-6 max-w-2xl text-4xl font-display leading-tight sm:text-5xl">
        This page doesn't exist. Unlike most of what we make, it isn't here on purpose.
      </h1>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/shop">Browse the shop</ButtonLink>
        <ButtonLink to="/" variant="outline">Go to the homepage</ButtonLink>
      </div>
    </Container>
  )
}
