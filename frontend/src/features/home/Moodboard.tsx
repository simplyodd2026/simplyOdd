import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScrapMotion } from '@/components/scrapbook/useScrapMotion'
import { Container } from '@/components/layout/Container'
import { Wordmark } from '@/components/brand/Wordmark'
import { TornNote } from '@/components/scrapbook/Torn'
import { PaperClip, PushPin, Tape } from '@/components/paper/Fasteners'
import { useHomePieces, type Piece } from './pieces'
import { useWishlist } from '@/stores/wishlist'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useImageAspect } from '@/lib/hooks'

type Note =
  | { kind: 'note'; text: string; tone: keyof typeof NOTE_TONES; voice: 'serif' | 'script' }
  | { kind: 'brand' }

// Notes pinned up between the photographs, in the studio's own words.
const NOTES: Note[] = [
  { kind: 'note', text: 'Some days are just odder.', tone: 'ivory', voice: 'script' },
  { kind: 'note', text: 'Spread odd moods.', tone: 'clay', voice: 'serif' },
  { kind: 'brand' },
  { kind: 'note', text: 'Normal is a little overrated.', tone: 'sage', voice: 'serif' },
  { kind: 'note', text: 'Meetings. Deadlines. Odd lamp. Repeat.', tone: 'ivory', voice: 'script' },
  { kind: 'note', text: 'A good day to be odd.', tone: 'caramel', voice: 'serif' },
]

// Torn paper in the palette's paler tones: ivory, a wash of clay, a wash of sage, pale caramel.
const NOTE_TONES = {
  ivory: { paper: '#FBF8F3', ink: 'text-ink' },
  clay: { paper: '#EED6C9', ink: 'text-plum' },
  sage: { paper: '#DDE2D2', ink: 'text-olive' },
  caramel: { paper: '#F1E1C4', ink: 'text-ink' },
}

// How each scrap is held up, in turn: a pin, a strip of tape, a paperclip.
const HOLDS = ['pin', 'tape', 'clip', 'pin', 'tape'] as const
const PIN_COLOURS = ['#A9532F', '#5E6647', '#D4A574', '#C98774']
// Varied heights are what make a masonry board feel collected rather than gridded.
// How many photos the board shows on a phone before it gets too long to scroll past.
const MOBILE_PIECES = 6
const ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-[5/6]']

/**
 * The Odd Board: the studio's mood board, pinned to a linen-covered board. Products hang as polaroids with
 * their names written underneath, notes are torn scraps in clay, sage and caramel, and everything is held
 * up with pins, washi tape or a paperclip. Hover a photo to save it to your wishlist.
 */
export function Moodboard() {
  const products = useHomePieces().moodboard.slice(0, 12)
  const root = useRef<HTMLDivElement>(null)
  useScrapMotion(root, [products.length])
  if (!products.length) return null

  // Weave a note in after every second photo; with only a few photos, after every one, so the board never looks bare.
  const tiles: ({ kind: 'product'; piece: Piece; i: number } | Note)[] = []
  const sparse = products.length < 6
  products.forEach((piece, i) => {
    tiles.push({ kind: 'product', piece, i })
    const note = NOTES[sparse ? i : Math.floor(i / 2)]
    if ((sparse || i % 2 === 1) && note) tiles.push(note)
  })
  if (sparse) NOTES.slice(products.length, 4).forEach((n) => tiles.push(n))
  // Phones get a shorter board: the first few photos and the notes between them.
  const afterLast = tiles.findIndex((t) => t.kind === 'product' && t.i === MOBILE_PIECES)
  const mobileCut = afterLast === -1 ? tiles.length : afterLast
  const columns = tiles.length >= 10 ? 'columns-2 sm:columns-3 lg:columns-4 xl:columns-5'
    : tiles.length > 4 ? 'columns-2 sm:columns-3 lg:columns-4'
      : ['columns-1', 'columns-1', 'columns-2', 'columns-2 sm:columns-3', 'columns-2 sm:columns-3 lg:columns-4'][tiles.length]

  return (
    <div ref={root}>
      <Container className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-12 text-center sm:mb-16">
            <p className="font-script text-[clamp(2.4rem,4vw,3.4rem)] leading-none text-accent">save it, pin it, love it</p>
            <h2 className="mt-2 font-display text-[clamp(2.8rem,5.6vw,5.5rem)] leading-[1] text-ink">The Odd Board</h2>
          </div>

          {/* A linen-covered pinboard with a thin wooden edge. */}
          <div className="slab bg-[#8A6A4F] p-2.5 shadow-[0_30px_50px_-30px_rgb(66_44_28/0.6)] sm:p-3">
            <div className="slab linen bg-sand px-3.5 pb-4 pt-9 shadow-[inset_0_3px_12px_rgb(66_44_28/0.25)] sm:px-9 sm:pb-8 sm:pt-12">
              <div className={cn('gap-4 sm:gap-8', columns)}>
                {tiles.map((t, k) => (
                  <div key={k} data-drop className={cn('relative mb-8 break-inside-avoid sm:mb-10', k >= mobileCut && 'max-sm:hidden')} style={{ rotate: `${((k * 37) % 7) - 3}deg` }}>
                    <Hold kind={HOLDS[k % HOLDS.length]} k={k} />
                    {t.kind === 'product' ? <Polaroid piece={t.piece} i={t.i} />
                      : t.kind === 'brand' ? <BrandCard />
                        : <NoteCard note={t} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

function Hold({ kind, k }: { kind: (typeof HOLDS)[number]; k: number }) {
  if (kind === 'pin') return <PushPin color={PIN_COLOURS[k % PIN_COLOURS.length]} className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2" />
  if (kind === 'tape') return <Tape tone={(['sand', 'sage', 'clay'] as const)[k % 3]} className={cn('absolute -top-3 left-1/2 z-10 -translate-x-1/2', k % 2 ? 'rotate-3' : '-rotate-3')} />
  return <PaperClip className="absolute -top-7 left-5 z-10 w-6 rotate-[6deg] drop-shadow-[0_2px_2px_rgb(0_0_0/0.25)]" />
}

function Polaroid({ piece, i }: { piece: Piece; i: number }) {
  const { product } = piece
  const saved = useWishlist((s) => s.ids.includes(product.id))
  const toggle = useWishlist((s) => s.toggle)
  const img = piece.image ?? product.images[i % 2 === 0 ? 1 : 0] ?? product.images[0]
  const fit = useImageAspect(0.6, 1.5)

  return (
    <Link to={`/product/${product.slug}`} className="group relative block bg-[#FBFAF7] p-2.5 pb-3 shadow-[0_14px_22px_-12px_rgb(66_44_28/0.55)] sm:p-3">
      <div className="relative overflow-hidden bg-ash">
        {img && <img {...fit.img} style={fit.style} src={img.url} alt={img.alt || product.name} loading="lazy" decoding="async"
          className={cn('w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]', ASPECTS[i % ASPECTS.length])} />}
        <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggle(product.id, product.name) }}
          className={cn('absolute right-2.5 top-2.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-[opacity,background-color] duration-300',
            saved ? 'bg-ink text-paper opacity-100' : 'bg-paper/95 text-ink opacity-0 hover:bg-ink hover:text-paper focus-visible:opacity-100 group-hover:opacity-100')}>
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {/* The caption written on the polaroid's wide bottom edge. */}
      {/* On a phone the name sits above the price in plain type, since the script is unreadable that small. */}
      <div className="flex flex-col gap-0.5 px-1 pt-2.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3 sm:pt-3">
        <span className="min-w-0 truncate font-odd text-[1.05rem] leading-[1.2] text-ink sm:font-script sm:text-[1.9rem] sm:leading-[1.15]">{product.name}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-smoke sm:text-[13px]">{money(product.price)}</span>
      </div>
    </Link>
  )
}

function NoteCard({ note }: { note: Extract<Note, { kind: 'note' }> }) {
  return (
    // The tone is set inline so it always wins over the base paper colour of a torn note.
    <TornNote seed={note.text} paperClassName={cn('grid min-h-32 place-items-center px-4 py-7 text-center sm:min-h-44 sm:px-7 sm:py-9', NOTE_TONES[note.tone].ink)}
      paperStyle={{ backgroundColor: NOTE_TONES[note.tone].paper }}>
      <p className={cn('text-balance', note.voice === 'serif' ? 'font-odd text-[1.3rem] leading-[1.12] sm:text-[1.9rem]' : 'font-script text-[1.7rem] leading-[1.05] sm:text-[2.3rem]')}>
        {note.text}
      </p>
    </TornNote>
  )
}

function BrandCard() {
  return (
    <div className="grain grid aspect-[4/5] place-items-center bg-olive p-4 text-center sm:p-7 text-paper shadow-[0_14px_22px_-12px_rgb(66_44_28/0.55)]">
      <div>
        <Wordmark light className="mx-auto h-auto w-full max-w-[12rem]" />
        <p className="mt-3 font-script text-[1.45rem] leading-none text-sun sm:mt-4 sm:text-[2rem]">made to be looked at</p>
        <div className="mx-auto my-3 h-px w-14 bg-paper/40 sm:my-5" />
        <p className="font-odd text-[0.95rem] leading-relaxed sm:text-[1.15rem]">Good objects,<br />brighter rooms,<br />odder you.</p>
      </div>
    </div>
  )
}
