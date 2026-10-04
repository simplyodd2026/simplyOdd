import { Link, NavLink, useParams } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { Accordion } from '@/components/ui/Accordion'
import { Reveal } from '@/components/motion/Reveal'
import { useDocumentTitle } from '@/lib/hooks'
import { cn } from '@/lib/cn'
import NotFoundPage from './NotFoundPage'

const TOPICS: Record<string, { title: string; intro: string; sections: [string, string][] }> = {
  shipping: {
    title: 'Shipping',
    intro: 'How long your piece takes to make, how it travels and what it costs.',
    sections: [
      ['When will my order ship?', 'Most pieces are printed to order and leave the studio within 2–4 business days. Large lamps can take up to 6.'],
      ['How long does delivery take?', 'Standard delivery takes 5–8 business days after dispatch. Express takes 2–3 business days to most metro PIN codes.'],
      ['What does shipping cost?', 'Standard shipping is ₹99, and free on orders over ₹1,999. Express shipping is ₹249.'],
      ['How is it packed?', 'Every piece is wrapped in recycled paper pulp and boxed with enough space that nothing touches the walls. No plastic fillers.'],
      ['Can I track my order?', 'Yes. When your order ships we add a tracking number to your order page in your account.'],
    ],
  },
  returns: {
    title: 'Returns',
    intro: 'Returns, refunds and what to do if something arrives damaged.',
    sections: [
      ['Can I return something?', 'Unused pieces in their original packaging can be returned within 14 days of delivery for a full refund of the item price.'],
      ['It arrived damaged.', 'Email hello@simplyodd.in with your order number and a photo within 48 hours of delivery. We’ll reprint it at no cost.'],
      ['How do refunds work?', 'Refunds go back to the original payment method within 5–7 business days of the return reaching us. Cash-on-delivery orders are refunded by bank transfer.'],
      ['Can I cancel my order?', 'You can cancel from your account until the order is in production. After that, return it once it arrives.'],
    ],
  },
  faq: {
    title: 'Questions',
    intro: 'Materials, finishes and the other things people ask us most.',
    sections: [
      ['What are the pieces made of?', 'Mostly plant-based PLA. Pieces that meet heat or water, like candle holders and lamps, use PETG. Each product page lists its materials.'],
      ['Why can I see lines on the surface?', 'They’re the layer lines from printing. We keep them on purpose, because they show how the object was built.'],
      ['Are vases watertight?', 'Vases marked watertight have a sealed interior. Planters include a drainage insert.'],
      ['Do you ship outside India?', 'Not yet. We’re working on it.'],
      ['Can you make something custom?', 'Yes. Use the Customise page to send us a brief, or email hello@simplyodd.in.'],
    ],
  },
}

export default function HelpPage() {
  const { topic = '' } = useParams()
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
          <p className="mt-10 text-smoke">Still need help? <a href="mailto:hello@simplyodd.in" className="link-draw text-ink">hello@simplyodd.in</a></p>
        </Reveal>
      </Container>
    </>
  )
}
