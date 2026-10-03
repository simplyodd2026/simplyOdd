import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScrapMotion } from '@/components/scrapbook/useScrapMotion'
import { Container } from '@/components/layout/Container'
import { ScrapHeading } from '@/components/scrapbook/ScrapHeading'
import { Slang } from '@/components/scrapbook/Slang'
import { ScrapWordmark } from '@/components/scrapbook/ScrapWordmark'
import { useProducts } from '@/lib/queries'
import { useWishlist } from '@/stores/wishlist'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Product } from '@/lib/types'
import { TornNote } from '@/components/scrapbook/Torn'
import { Lollipop, SmileyFlower } from '@/components/scrapbook/Stickers'

type Note =
  | { kind: 'note'; text: string; tone: keyof typeof NOTE_TONES; big?: boolean }
  | { kind: 'brand' }

// Scribbled cards that sit between the photos, like a pinned moodboard.
const NOTES: Note[] = [
  { kind: 'note', text: 'Some days are just odder', tone: 'butter' },
  { kind: 'note', text: 'Spread odd moods', tone: 'pink', big: true },
  { kind: 'brand' },
  { kind: 'note', text: 'Normal is a little overrated', tone: 'mint' },
  { kind: 'note', text: 'Meetings. Deadlines. Odd lamp. Repeat.', tone: 'sky' },
  { kind: 'note', text: "It's a good day to be odd", tone: 'lilac', big: true },
]

const NOTE_TONES = {
  pink: 'bg-pink-2 text-plum',
  butter: 'bg-butter text-ink',
  mint: 'bg-mint text-ink',
  sky: 'bg-sky text-ink',
  lilac: 'bg-lilac text-plum',
}

// Varied heights are what make a masonry board feel collected rather than gridded.
const ASPECTS = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-square', 'aspect-[2/3]', 'aspect-[4/5]', 'aspect-[3/4]']

/** "The Odd Board": a Pinterest-style masonry of products and handwritten notes. */
export function Moodboard() {
  const { data } = useProducts({ sort: 'popular', page_size: 12 })
  const products = data?.items ?? []
  const root = useRef<HTMLDivElement>(null)
  useScrapMotion(root, [products.length])
  if (!products.length) return null

  // Weave a note in after every second photo.
  const tiles: ({ kind: 'product'; product: Product; i: number } | Note)[] = []
  products.forEach((product, i) => {
    tiles.push({ kind: 'product', product, i })
    const note = NOTES[Math.floor(i / 2)]
    if (i % 2 === 1 && note) tiles.push(note)
  })

  return (
    <div ref={root}>
    <Container className="relative py-16 sm:py-20">
      <Lollipop className="absolute left-[12%] top-8 hidden w-12 -rotate-12 lg:block" />
      <SmileyFlower className="absolute right-[13%] top-12 hidden w-16 rotate-6 lg:block" />
      <Slang text="it's giving one-of-one" tone="lilac" tilt={4} className="absolute right-[21%] top-24 hidden xl:inline-flex" />
      <ScrapHeading center variant="marker" kicker="save it, pin it, love it" title="The Odd Board" />
      {/* A framed corkboard; every scrap is pinned on with a coloured push pin. */}
      <div className="rounded-[1.25rem] bg-[#A0714A] p-3 shadow-[0_24px_50px_-24px_rgb(67_48_42/0.6),inset_0_2px_0_rgb(255_255_255/0.25)] sm:p-4">
        <div className="cork rounded-[0.5rem] p-4 pt-7 shadow-[inset_0_4px_14px_rgb(67_48_42/0.45)] sm:p-7 sm:pt-9">
          <div className="columns-2 gap-5 sm:columns-3 lg:columns-4 xl:columns-5">
            {tiles.map((t, k) => (
              <div key={k} data-drop className="relative mb-7 break-inside-avoid" style={{ rotate: `${((k * 37) % 7) - 3}deg` }}>
                <PushPin color={PINS[k % PINS.length]} />
                {t.kind === 'product' ? <Pin product={t.product} i={t.i} />
                  : t.kind === 'brand' ? <BrandNote />
                    : <NoteCard note={t} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
    </div>
  )
}

const PINS = ['#C98A6B', '#7F1D1D', '#E0B44C', '#C98A6B', '#B9A390']

function PushPin({ color }: { color: string }) {
  return (
    <span aria-hidden="true" data-pin className="absolute -top-3 left-1/2 z-10 block size-5 -translate-x-1/2 rounded-full shadow-[2px_4px_4px_rgb(0_0_0/0.35)]"
      style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc 0 18%, ${color} 22%)` }} />
  )
}

function Pin({ product, i }: { product: Product; i: number }) {
  const saved = useWishlist((s) => s.ids.includes(product.id))
  const toggle = useWishlist((s) => s.toggle)
  const img = product.images[i % 2 === 0 ? 1 : 0] ?? product.images[0]
  const caption = i % 3 === 0 && product.tagline

  return (
    <Link to={`/product/${product.slug}`} className="group relative block overflow-hidden rounded-[0.125rem] bg-paper p-2 shadow-[0_10px_18px_-10px_rgb(67_48_42/0.6)]">
      {img && <img src={img.url} alt={img.alt || product.name} loading="lazy" decoding="async"
        className={cn('w-full bg-ash object-cover', ASPECTS[i % ASPECTS.length])} />}
      {caption && (
        <p className="font-hand pointer-events-none absolute left-3 top-3 max-w-[72%] -rotate-3 rounded-[0.5rem] bg-cream px-3 py-2 text-sm leading-snug text-plum shadow-md">
          {caption} <span aria-hidden="true">♡</span>
        </p>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggle(product.id, product.name) }}
        className={cn('absolute right-3 top-3 rounded-full px-4 py-2 text-sm font-bold transition-all duration-300',
          saved ? 'bg-ink text-paper opacity-100' : 'bg-accent text-paper opacity-0 hover:bg-ink focus-visible:opacity-100 group-hover:opacity-100')}>
        {saved ? 'Saved ♥' : 'Save'}
      </button>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-paper opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="font-semibold leading-tight">{product.name}</span>
        <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-xs font-bold tabular-nums text-ink">{money(product.price)}</span>
      </div>
    </Link>
  )
}

function NoteCard({ note }: { note: Extract<Note, { kind: 'note' }> }) {
  return (
    <div className="relative">
      <TornNote seed={note.text} paperClassName={cn('grid min-h-44 place-items-center p-7 text-center', NOTE_TONES[note.tone])}>
        <p className={cn('text-balance', note.big ? 'font-chewy text-4xl leading-[1.05]' : 'font-hand text-xl leading-relaxed')}>
          {note.text}
          <span aria-hidden="true" className="mt-2 block font-hand text-xl">♡</span>
        </p>
      </TornNote>
    </div>
  )
}

function BrandNote() {
  return (
    <div className="grain grid aspect-[4/5] place-items-center rounded-[0.125rem] bg-sage p-6 text-center text-cream shadow-[0_10px_18px_-10px_rgb(67_48_42/0.6)]">
      <div>
        <ScrapWordmark className="text-5xl" />
        <p className="font-hand mt-3 text-sm">made to be looked at</p>
        <div className="mx-auto my-4 h-px w-16 bg-cream/40" />
        <p className="font-hand text-sm leading-relaxed">Good objects<br />brighter rooms<br />odder you</p>
        <span aria-hidden="true" className="mt-2 block font-hand">♡</span>
      </div>
    </div>
  )
}
