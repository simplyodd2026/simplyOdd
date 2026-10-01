import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { Icon } from '@/components/ui/Icon'
import { Sparkle, Strawberry } from '@/components/scrapbook/Stickers'

/** A cut-out coupon and a gift tag on a string. */
export function PromoPair() {
  return (
    <Container className="grid items-center gap-12 py-12 lg:grid-cols-12">
      <Coupon />
      <GiftTag />
    </Container>
  )
}

function Coupon() {
  return (
    <Link to="/shop" className="group relative block -rotate-1 transition-transform duration-300 hover:rotate-0 lg:col-span-7">
      <div className="grain flex overflow-hidden rounded-2xl bg-butter shadow-[0_18px_34px_-18px_rgb(67_48_42/0.55)]">
        <div className="flex-1 p-7 sm:p-9">
          <p className="font-hand text-lg text-accent">a little welcome gift</p>
          <p className="mt-2 font-display text-6xl leading-none text-ink sm:text-7xl">10% off</p>
          <p className="mt-2 text-graphite">your first odd thing, on anything in the shop</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="rounded-lg border-2 border-dashed border-ink/60 bg-paper/60 px-4 py-2 font-bold tracking-[0.25em] text-ink">ODDONE</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 group-hover:underline">
              Use it now <Icon name="chevronRight" size={16} />
            </span>
          </div>
        </div>
        {/* Tear-off stub */}
        <div className="relative hidden w-28 shrink-0 items-center justify-center border-l-2 border-dashed border-ink/35 sm:flex">
          <span className="absolute -left-4 -top-4 size-8 rounded-full bg-paper" />
          <span className="absolute -bottom-4 -left-4 size-8 rounded-full bg-paper" />
          <span className="absolute -left-3 top-1/2 -translate-y-1/2 bg-butter py-1 text-ink/60" aria-hidden="true">✂</span>
          <p className="rotate-90 whitespace-nowrap text-xs font-bold uppercase tracking-[0.3em] text-ink/70">admit one odd human</p>
        </div>
      </div>
      <Sparkle className="absolute -right-3 -top-5 w-12" />
    </Link>
  )
}

function GiftTag() {
  return (
    <Link to="/shop?max=999&sort=price_asc" className="group relative mx-auto block w-full max-w-md rotate-2 transition-transform duration-300 hover:rotate-0 lg:col-span-5">
      {/* The string, looping off the eyelet */}
      <svg viewBox="0 0 120 80" aria-hidden="true" className="absolute -left-16 top-4 w-28 text-[#B8966A]">
        <path d="M118 38C90 30 70 60 46 50S24 10 4 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="cutout">
        <div className="grain relative bg-mint py-8 pl-16 pr-8" style={{ clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 14% 100%, 0 50%)' }}>
          <span aria-hidden="true" className="absolute left-7 top-1/2 size-5 -translate-y-1/2 rounded-full border-[3px] border-[#B8966A] bg-paper" />
          <p className="font-hand text-base text-graphite">to: you <span aria-hidden="true">♡</span> from: us</p>
          <p className="mt-2 font-display text-4xl leading-[1.05] text-ink">Odd little gifts under ₹999</p>
          <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-colors group-hover:bg-accent">
            Find one <Icon name="chevronRight" size={16} />
          </span>
        </div>
      </div>
      <Strawberry className="absolute -bottom-6 -right-4 w-16 rotate-12" />
    </Link>
  )
}
