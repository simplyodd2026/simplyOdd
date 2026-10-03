import { Link } from 'react-router-dom'
import { useProducts } from '@/lib/queries'
import { Container } from '@/components/layout/Container'
import { Reveal } from '@/components/motion/Reveal'
import { FitImage } from '@/components/product/FitImage'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

function Banner({ to, label, title, cta, image, dark }: { to: string; label: string; title: string; cta: string; image?: string; dark?: boolean }) {
  return (
    <Link to={to}
      className={cn('group grid min-h-[22rem] grid-cols-2 overflow-hidden rounded-xl shadow-[0_20px_40px_-28px_rgb(26_26_26/0.35)]', dark ? 'bg-night text-paper' : 'bg-butter text-ink')}>
      <div className="flex flex-col justify-between p-6 sm:p-10">
        <span className={cn('label', dark ? 'text-paper/60' : 'text-ink/60')}>{label}</span>
        <div>
          <h3 className="font-display text-[clamp(2rem,3.4vw,3.4rem)] leading-[0.98]">{title}</h3>
          <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium">
            <span className="link-draw">{cta}</span>
            <Icon name="arrowRight" size={16} className="transition-transform duration-500 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
      <FitImage src={image} alt="" className="h-full min-h-[16rem]" panel={dark ? 'bg-paper/5' : 'bg-sun/35'}
        imgClassName="transition-transform duration-[1.4s] ease-[var(--ease-out-quint)] group-hover:scale-105" />
    </Link>
  )
}

/** Two editorial offers side by side: an affordable entry point and the commission service. */
export function PromoBanners() {
  const { data: gifts } = useProducts({ max_price: 999, sort: 'popular', page_size: 1 })
  const { data: lighting } = useProducts({ category: 'lighting', sort: 'popular', page_size: 1 })
  const gift = gifts?.items[0]
  const lamp = lighting?.items[0]
  return (
    <Container className="py-4">
      <Reveal stagger={0.1} className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Banner to="/shop?max=999&sort=price_asc" label="Gift edit" title="Gifts under ₹999" cta="Shop gifts" image={gift?.images[1]?.url ?? gift?.images[0]?.url} />
        <Banner to="/custom" label="Commissions" title="Made to your brief" cta="Start a commission" image={lamp?.images[1]?.url ?? lamp?.images[0]?.url} dark />
      </Reveal>
    </Container>
  )
}
