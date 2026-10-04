import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import type { ProductImage } from '@/lib/types'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { PrintImage } from '@/components/motion/Reveal'
import { useOverlay } from '@/components/ui/Overlay'

/**
 * Desktop: an editorial stack, the hero shot full width and the rest in pairs, each printed in as it arrives.
 * Touch: a swipeable strip with a counter. Either opens a full-screen viewer.
 */
export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [viewer, setViewer] = useState<number | null>(null)
  const [active, setActive] = useState(0)
  const count = images.length

  if (!count) return <div className="aspect-[4/5] bg-ash" />

  return (
    <>
      <div className="hidden gap-2 lg:grid lg:grid-cols-2">
        {images.map((img, i) => (
          <button key={img.url} type="button" onClick={() => setViewer(i)} aria-label={`Open image ${i + 1} of ${count}`}
            className={cn('block cursor-zoom-in text-left', i === 0 || (count === 2 && i === 1) ? 'col-span-2' : '')}>
            <PrintImage src={img.url} alt={img.alt || name} priority={i === 0} delay={i === 0 ? 0.2 : 0}
              className={i === 0 ? 'aspect-[4/5] xl:aspect-[5/6]' : 'aspect-[4/5]'} />
          </button>
        ))}
      </div>

      <div className="relative -mx-5 sm:-mx-8 lg:hidden">
        <div className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
          onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {images.map((img, i) => (
            <button key={img.url} type="button" onClick={() => setViewer(i)} className="w-full shrink-0 snap-center" aria-label={`Open image ${i + 1} of ${count}`}>
              <img src={img.url} alt={img.alt || name} loading={i === 0 ? 'eager' : 'lazy'} className="aspect-[4/5] w-full bg-ash object-cover" />
            </button>
          ))}
        </div>
        {count > 1 && (
          <div className="absolute inset-x-5 bottom-4 flex items-center gap-3 sm:inset-x-8">
            <span className="font-mono text-[11px] tabular-nums text-ink">{String(active + 1).padStart(2, '0')}/{String(count).padStart(2, '0')}</span>
            <div className="h-px flex-1 bg-ink/15">
              <div className="h-full bg-ink transition-transform duration-500 ease-[var(--ease-out-quint)]"
                style={{ width: `${100 / count}%`, transform: `translateX(${active * 100}%)` }} />
            </div>
          </div>
        )}
      </div>

      <Viewer images={images} name={name} index={viewer} onChange={setViewer} />
    </>
  )
}

export function Viewer({ images, name, index, onChange }: { images: ProductImage[]; name: string; index: number | null; onChange: (i: number | null) => void }) {
  const open = index !== null
  const count = images.length
  const close = () => onChange(null)
  const [dir, setDir] = useState(1)
  useOverlay(open, close)
  const go = (d: number) => { if (index === null) return; setDir(d); onChange((index + d + count) % count) }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return createPortal(
    <AnimatePresence>
      {index !== null && (
        <motion.div role="dialog" aria-modal="true" aria-label={`${name} images`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[60] flex flex-col bg-paper">
          <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
            <span className="font-mono text-[12px] tabular-nums text-fog">{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
            <button onClick={close} className="grid size-11 place-items-center rounded-full bg-ink text-paper" aria-label="Close"><Icon name="close" /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 pb-5">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.img key={images[index].url} src={images[index].url} alt={images[index].alt || name} draggable={false}
                custom={dir}
                variants={{ enter: (d: number) => ({ x: `${d * 12}%`, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: `${d * -12}%`, opacity: 0 }) }}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}
                onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 60) go(info.offset.x < 0 ? 1 : -1) }}
                className="h-full max-h-full w-auto max-w-full bg-ash object-contain" />
            </AnimatePresence>
            {count > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label="Previous image" className="absolute left-5 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-ink/20 bg-paper text-ink transition-colors hover:bg-ink hover:text-paper sm:grid"><Icon name="arrowLeft" /></button>
                <button onClick={() => go(1)} aria-label="Next image" className="absolute right-5 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-ink/20 bg-paper text-ink transition-colors hover:bg-ink hover:text-paper sm:grid"><Icon name="arrowRight" /></button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
