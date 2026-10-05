import { motion } from 'motion/react'
import { useProducts } from '@/lib/queries'
import { PaperClip } from '@/components/paper/Fasteners'

const EASE = [0.16, 1, 0.3, 1] as const
// How far the bottom-right corner of the sheet is folded back.
const CURL = 'clamp(5.5rem, 12vw, 9.5rem)'

/** A black binder clip, the kind that holds a stack of papers, with its two silver wire handles up. */
function BinderClip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="clip-wire" x1="0" x2="1">
          <stop offset="0" stopColor="#8B8B8B" /><stop offset="0.5" stopColor="#F2F2F2" /><stop offset="1" stopColor="#7A7A7A" />
        </linearGradient>
        <linearGradient id="clip-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3A3A3A" /><stop offset="0.45" stopColor="#111" /><stop offset="1" stopColor="#000" />
        </linearGradient>
      </defs>
      <path d="M34 66 L26 14 Q25 6 33 6 L87 6 Q95 6 94 14 L86 66" fill="none" stroke="url(#clip-wire)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M14 64 L106 64 L96 112 L24 112 Z" fill="url(#clip-body)" />
      <path d="M14 64 L106 64 L103 72 L17 72 Z" fill="#4A4A4A" />
      <circle cx="30" cy="68" r="3" fill="#BDBDBD" /><circle cx="90" cy="68" r="3" fill="#BDBDBD" />
    </svg>
  )
}

/** A thin heart, as if drawn with the same pen as the signature. */
function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 42" className={className} aria-hidden="true">
      <path d="M24 39 C10 29 3 21 4 12.5 C5 6 10 3 15 3.5 C19.5 4 22.5 7 24 11 C25.5 7 28.5 4 33 3.5 C38 3 43 6 44 12.5 C45 21 38 29 24 39 Z"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/** Two short rules with a four-pointed star between them. */
function Ornament({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <span className="h-px flex-1 bg-sage" />
      <svg viewBox="0 0 16 16" className="size-3.5 text-sage"><path d="M8 0 C8.6 5 11 7.4 16 8 C11 8.6 8.6 11 8 16 C7.4 11 5 8.6 0 8 C5 7.4 7.4 5 8 0 Z" fill="currentColor" /></svg>
      <span className="h-px flex-1 bg-sage" />
    </div>
  )
}

/**
 * The opening of the About page: a single sheet of ivory paper laid on a dark, blurred photograph of the
 * studio's work. It's held by a binder clip, has a polaroid paperclipped to it, a signature, a short note
 * about who we are, a hand-written sign-off and the studio's mark, and its bottom corner curls back.
 */
export function AboutSheet() {
  const { data } = useProducts({ flag: 'featured', sort: 'popular', page_size: 2 })
  const piece = data?.items[0]
  const photo = piece?.images[1] ?? piece?.images[0]
  const backdrop = piece?.images[0]

  return (
    <section className="relative isolate overflow-hidden bg-night px-4 pb-24 pt-14 sm:px-8 sm:pb-32 sm:pt-20">
      {/* The table the sheet rests on: the studio's work, out of focus and in black and white. */}
      {backdrop && <img src={backdrop.url} alt="" aria-hidden className="absolute inset-0 -z-10 size-full scale-110 object-cover opacity-45 blur-[6px] grayscale" />}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(46_35_27/0.25),rgb(46_35_27/0.85))]" />

      <motion.div initial={{ opacity: 0, y: 40, rotate: 1.2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 1.3, ease: EASE }}
        className="relative mx-auto max-w-[62rem]">
        {/* The paper itself, with its bottom-right corner cut away for the curl. The shadow sits on a wrapper
            so the clip-path doesn't cut it off. */}
        <div aria-hidden className="absolute inset-0 drop-shadow-[0_30px_40px_rgb(0_0_0/0.45)]">
          <div className="grain size-full bg-[#F4F0EA]"
            style={{ clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${CURL}), calc(100% - ${CURL}) 100%, 0 100%)` }} />
        </div>
        {/* The curled-back corner: the underside of the paper, catching light along the fold. */}
        <div aria-hidden className="absolute bottom-0 right-0 drop-shadow-[-10px_-8px_14px_rgb(0_0_0/0.22)]" style={{ width: CURL, height: CURL }}>
          <div className="size-full"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
              background: 'linear-gradient(135deg, #D9D1C5 0%, #ECE6DD 38%, #FBF8F3 49%, #CFC6B8 50%)',
              borderBottomRightRadius: '70%',
            }} />
        </div>

        <BinderClip className="absolute -top-10 right-[6%] z-10 w-20 rotate-[14deg] drop-shadow-[0_8px_8px_rgb(0_0_0/0.35)] sm:-top-14 sm:w-28" />

        <div className="relative px-6 pb-28 pt-14 sm:px-14 sm:pb-20 sm:pt-20 lg:px-20">
          <h1 className="text-center font-display text-[clamp(3.6rem,10vw,8.5rem)] leading-[0.95] tracking-[-0.03em] text-ink">
            about <span className="font-odd">us.</span>
          </h1>

          <div className="mt-12 grid items-start gap-14 md:grid-cols-[1.05fr_1fr] md:gap-12 lg:mt-16">
            {/* The polaroid, paperclipped on at an angle. */}
            <motion.figure initial={{ opacity: 0, rotate: -9, y: 30 }} animate={{ opacity: 1, rotate: -4, y: 0 }} transition={{ duration: 1.4, ease: EASE, delay: 0.35 }}
              className="relative mx-auto w-full max-w-[min(26rem,calc((100svh-12rem)*0.8))] bg-[#FBFAF7] p-3 pb-14 shadow-[0_18px_30px_-12px_rgb(0_0_0/0.4)] sm:p-4 sm:pb-16 md:-ml-10">
              <PaperClip className="absolute -left-2 -top-11 z-10 w-8 rotate-[8deg] drop-shadow-[0_2px_2px_rgb(0_0_0/0.25)] sm:-top-14 sm:w-10" />
              <div className="aspect-[4/4.4] overflow-hidden bg-ash">
                {photo && <img src={photo.url} alt={photo.alt || piece?.name || 'A piece from the studio'} className="size-full object-cover" />}
              </div>
              {piece && <figcaption className="absolute inset-x-0 bottom-4 text-center font-script text-[1.9rem] leading-none text-graphite sm:bottom-5">{piece.name}</figcaption>}
            </motion.figure>

            <div className="md:pt-6">
              <p className="font-script text-center text-[clamp(4rem,7vw,5.75rem)] leading-[0.9] text-ink">simply odd</p>
              <div className="mt-4 h-px bg-sage" />
              <p className="mt-5 text-center text-[13px] font-medium uppercase tracking-[0.34em] text-ink sm:text-[14px]">Simply Odd Studio</p>
              <Ornament className="mx-auto mt-5 flex max-w-[16rem] items-center gap-3" />
              <div className="mt-8 space-y-5 text-[16px] leading-[1.7] text-graphite">
                <p>We design strange, beautiful objects for the home: lamps, vessels and small sculptures that make a corner feel finished.</p>
                <p>Every piece is drawn in our studio and made only when someone orders it, then sanded, checked and packed by hand. Our aim isn’t just a nice object, but one people stop at, look closer at, and ask about.</p>
              </div>
            </div>
          </div>

          <div className="mt-16 grid items-end gap-12 sm:grid-cols-2 sm:pr-[clamp(4rem,10vw,8rem)]">
            <div className="text-ink">
              <p className="font-script -rotate-6 text-[clamp(3rem,5vw,4.25rem)] leading-[1.05]">Let’s make<br />something odd.</p>
              <Heart className="ml-[22%] mt-3 w-12" />
            </div>
            <div className="text-center">
              <img src="/logo-mark.png" alt="Simply Odd" className="mx-auto h-9 w-auto" />
              <Ornament className="mx-auto mt-4 flex max-w-[14rem] items-center gap-3" />
              <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-smoke">Made-to-order objects for the home</p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
