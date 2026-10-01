import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/layout/Container'
import { Bolt, Daisy, DenimStar, Mushroom, Sparkle } from '@/components/scrapbook/Stickers'

/**
 * "Our story" is a letter slipping out of an envelope, with product stamps and a postmark,
 * on a full-width band framed by airmail stripes.
 */
export function BrandStory() {
  return (
    <section className="relative my-16 sm:my-24">
      <div className="airmail h-3.5" aria-hidden="true" />
      <div className="airmail-paper relative overflow-hidden">
        <Container className="relative py-16 sm:py-20">
          <SectionHeading center variant="ransom" kicker="a letter from the studio" title="our story" />
          <div className="relative mx-auto grid items-center gap-12 lg:grid-cols-12">
            <div className="relative lg:col-span-8">
              {/* Envelope back */}
              <div className="grain absolute inset-x-0 bottom-0 top-24 rounded-xl bg-peach shadow-[0_24px_40px_-22px_rgb(67_48_42/0.55)]" aria-hidden="true" />
              {/* The letter */}
              <div className="lined-paper relative mx-4 -rotate-1 rounded-sm px-6 pb-24 pt-8 shadow-[0_10px_24px_-10px_rgb(67_48_42/0.4)] sm:mx-10 sm:pl-20 sm:pr-10">
                <p className="font-hand text-xl leading-[34px] text-ink">Hello, you <span aria-hidden="true">♡</span></p>
                <div className="mt-1 flex flex-col gap-[34px] text-[17px] leading-[34px] text-ink">
                  <p>
                    Simply Odd started with a small, stubborn thought: most homes are full of things nobody really
                    looks at. We wanted to make the opposite, objects that make people stop, tilt their heads and ask
                    where you got it.
                  </p>
                  <p>
                    Every piece starts as a question, like “what if a vase leaned?”. We draw it, print it, and reprint
                    it until the proportions feel slightly wrong in exactly the right way. Then we keep the layer lines,
                    because they show how it was made.
                  </p>
                </div>
                <p className="font-hand mt-2 text-right text-xl leading-[34px] text-accent">with love, the Simply Odd studio</p>
              </div>
              {/* Envelope front pocket with its folded flaps */}
              <div className="grain relative -mt-20 h-32 overflow-hidden rounded-b-xl bg-peach" aria-hidden="true">
                <div className="absolute inset-0 bg-[#EDBF9E]" style={{ clipPath: 'polygon(0 0, 50% 70%, 100% 0, 100% 100%, 0 100%)' }} />
                <div className="absolute inset-0 bg-[#F2CBAE]" style={{ clipPath: 'polygon(0 100%, 50% 38%, 100% 100%)' }} />
              </div>
              <DenimStar className="absolute -bottom-6 -left-6 w-20 -rotate-12" />
            </div>

            <div className="relative flex flex-col items-center gap-8 lg:col-span-4">
              <div className="relative">
                <div className="flex gap-4">
                  <Stamp src="/seed/melt-vase-3.svg" value="₹5" tilt={-6} />
                  <Stamp src="/seed/fungal-lamp-2.svg" value="₹10" tilt={5} />
                </div>
                <Postmark className="absolute -bottom-10 -right-8 w-32" />
              </div>
              <div className="mt-6 text-center">
                <p className="font-hand text-lg text-smoke">p.s. the layer lines are on purpose</p>
                <Link to="/about" className="mt-4 inline-flex h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper transition-colors hover:bg-accent">
                  Read how we work
                </Link>
              </div>
              <Sparkle className="absolute -top-8 left-4 w-10" />
              <Bolt className="absolute -bottom-12 right-2 hidden w-12 rotate-12 lg:block" color="#F2CBAE" />
            </div>
          </div>
        </Container>
        <Daisy className="absolute -left-6 top-10 hidden w-24 -rotate-12 lg:block" petal="#FBF7F0" />
        <Mushroom className="absolute -right-4 bottom-10 hidden w-20 rotate-12 lg:block" cap="#D3C8EE" />
      </div>
      <div className="airmail h-3.5" aria-hidden="true" />
    </section>
  )
}

/** A postage stamp. The dotted white border, set on a coloured card, reads as perforations. */
function Stamp({ src, value, tilt }: { src: string; value: string; tilt: number }) {
  return (
    <div className="bg-paper-3 p-1 shadow-[0_8px_14px_-8px_rgb(67_48_42/0.5)]" style={{ rotate: `${tilt}deg` }}>
      <div className="relative w-28 border-[5px] border-dotted border-paper-3 bg-paper p-2 sm:w-32">
        <img src={src} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
        <span className="absolute bottom-3 right-3 rounded-sm bg-paper/90 px-1 text-xs font-bold text-ink">{value}</span>
      </div>
    </div>
  )
}

function Postmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className={`pointer-events-none text-ink/60 ${className ?? ''}`}>
      <circle cx="52" cy="55" r="42" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="52" cy="55" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="52" y="50" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="Prompt, sans-serif">SMALL BATCH</text>
      <text x="52" y="66" textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="Prompt, sans-serif">SIMPLY ODD</text>
      {[0, 14, 28].map((y) => <path key={y} d={`M96 ${38 + y}c10-8 20 8 30 0s20 8 30 0`} fill="none" stroke="currentColor" strokeWidth="2.5" />)}
    </svg>
  )
}
