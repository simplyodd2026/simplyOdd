import { Link, NavLink, useParams } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { Accordion } from '@/components/ui/Accordion'
import { Reveal } from '@/components/motion/Reveal'
import { useDocumentTitle } from '@/lib/hooks'
import { money } from '@/lib/format'
import { useShippingRates } from '@/lib/queries'
import { cn } from '@/lib/cn'
import NotFoundPage from './NotFoundPage'

type Rates = ReturnType<typeof useShippingRates>

const topics = (rates: Rates): Record<string, { title: string; intro: string; sections: [string, string][] }> => ({
  shipping: {
    title: 'Shipping',
    intro: 'How long your piece takes to make, how it travels and what it costs.',
    sections: [
      ['When will my order ship?', 'Every piece is made to order, so how long it takes depends on the piece and what else is on the printers. Your order page shows when it goes into production and when it ships.'],
      ['How long does delivery take?', 'It depends on where you are and the courier, so we can’t promise a date. Once your order ships, its tracking number on your order page shows where it is.'],
      ['What does shipping cost?', `Standard shipping is ${money(rates.standardFee)}, and free on orders over ${money(rates.freeOver)}. Express shipping is ${money(rates.expressFee)}.`],
      ['How is it packed?', 'Every piece is wrapped in recycled paper pulp and boxed with enough space that nothing touches the walls. No plastic fillers.'],
      ['Can I track my order?', 'Yes. When your order ships we add a tracking number to your order page in your account.'],
    ],
  },
  returns: {
    title: 'Returns',
    intro: 'Returns, refunds and what to do if something arrives damaged.',
    sections: [
      ['Can I return something?', 'Unused pieces in their original packaging can be returned within 14 days of delivery for a full refund of the item price.'],
      ['It arrived damaged.', 'Email simplyodd2026@gmail.com with your order number and a photo within 48 hours of delivery. We’ll remake it at no cost.'],
      ['How do refunds work?', 'Refunds go back to the original payment method within 5–7 business days of the return reaching us. Cash-on-delivery orders are refunded by bank transfer.'],
      ['Can I cancel my order?', 'You can cancel from your account until the order is in production. After that, return it once it arrives.'],
    ],
  },
  faq: {
    title: 'Questions',
    intro: 'Materials, finishes and the other things people ask us most.',
    sections: [
      ['What are the pieces made of?', 'Mostly plant-based PLA. Pieces that meet heat or water, like candle holders and lamps, use PETG. Each product page lists its materials.'],
      ['Why can I see lines on the surface?', 'They’re the fine layer lines left as each piece is built up. We keep them on purpose, because they show how the object was made.'],
      ['Are vases watertight?', 'Vases marked watertight have a sealed interior. Planters include a drainage insert.'],
      ['Do you ship outside India?', 'Not yet. We’re working on it.'],
      ['Can you make something custom?', 'Yes. Use the Customise page to send us a brief, or email simplyodd2026@gmail.com.'],
    ],
  },
})

export default function HelpPage() {
  const { topic = '' } = useParams()
  const TOPICS = topics(useShippingRates())
  const page = TOPICS[topic]
  useDocumentTitle(page?.title)
  if (!page) return <NotFoundPage />
  return (
    <>
      <PageHeader key={topic} trail={<><Link to="/" className="link-draw hover:text-ink">Home</Link><span>/</span><span>Help</span><span>/</span><span className="text-ink">{page.title}</span></>}
        title={page.title} intro={page.intro} />
      <Container className="grid gap-10 pb-28 sm:pb-40 lg:grid-cols-12">
        <nav className="flex gap-2 lg:col-span-3 lg:flex-col lg:items-start" aria-label="Help topics">
          {Object.entries(TOPICS).map(([k, t]) => (
            <NavLink key={k} to={`/help/${k}`}
              className={({ isActive }) => cn('rounded-full px-4 py-2 text-[14px] transition-colors', isActive ? 'bg-ink text-paper' : 'text-smoke hover:bg-ink/5 hover:text-ink')}>
              {t.title}
            </NavLink>
          ))}
        </nav>
        <Reveal key={topic} className="border-t border-rule lg:col-span-8 lg:col-start-5">
          {page.sections.map(([q, a], i) => <Accordion key={q} title={q} defaultOpen={i === 0}><p>{a}</p></Accordion>)}
          <p className="mt-10 text-smoke">Still need help? <a href="mailto:simplyodd2026@gmail.com" className="link-draw text-ink">simplyodd2026@gmail.com</a></p>
        </Reveal>
      </Container>
    </>
  )
}
