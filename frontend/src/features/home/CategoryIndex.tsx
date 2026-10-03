import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories } from '@/lib/queries'
import { gsap, useGSAP, finePointer, reducedMotion, EASE } from '@/lib/motion'
import { plural } from '@/lib/format'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/misc'
import { cn } from '@/lib/cn'

/**
 * Collections as a typographic index. On desktop a framed preview trails the pointer and swaps
 * to the collection under it; on touch each row carries its own thumbnail.
 */
export function CategoryIndex({ large = false, showDescriptions = false }: { large?: boolean; showDescriptions?: boolean }) {
  const { data: categories, isLoading } = useCategories()
  const root = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const move = useRef<((e: React.PointerEvent) => void) | null>(null)

  useGSAP(() => {
    if (!finePointer() || reducedMotion() || !preview.current) return
    gsap.set(preview.current, { xPercent: -50, yPercent: -50 })
    const xTo = gsap.quickTo(preview.current, 'x', { duration: 0.8, ease: 'power3' })
    const yTo = gsap.quickTo(preview.current, 'y', { duration: 0.8, ease: 'power3' })
    move.current = (e) => {
      const r = root.current!.getBoundingClientRect()
      xTo(e.clientX - r.left)
      yTo(e.clientY - r.top)
    }
    gsap.from('.ci-row', {
      y: 40, autoAlpha: 0, duration: 1.1, ease: EASE.out, stagger: 0.06,
      scrollTrigger: { trigger: root.current, start: 'top 85%', once: true },
    })
  }, { scope: root, dependencies: [categories?.length] })

  useGSAP(() => {
    if (!preview.current || reducedMotion()) return
    gsap.to(preview.current, { autoAlpha: active === null ? 0 : 1, scale: active === null ? 0.85 : 1, duration: 0.6, ease: EASE.out })
  }, { dependencies: [active] })

  return (
    <div ref={root} className="relative" onPointerMove={(e) => move.current?.(e)} onPointerLeave={() => setActive(null)}>
      <ul className="border-t border-rule">
        {isLoading && Array.from({ length: 6 }, (_, i) => <li key={i} className="border-b border-rule py-6"><Skeleton className="h-14" /></li>)}
        {categories?.map((c, i) => (
          <li key={c.id} className="ci-row border-b border-rule">
            <Link to={`/collections/${c.slug}`} onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
              className={cn('group grid items-center gap-x-6 gap-y-2 py-5 sm:py-7', showDescriptions ? 'grid-cols-[auto_1fr_auto] lg:grid-cols-[4rem_1fr_22rem_6rem]' : 'grid-cols-[auto_1fr_auto] lg:grid-cols-[4rem_1fr_8rem_3rem]')}>
              <span className="hidden font-mono text-[11px] text-fog lg:block">{String(i + 1).padStart(2, '0')}</span>
              <span className="size-16 overflow-hidden bg-ash lg:hidden">
                {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </span>
              <span className={cn('font-display leading-[0.95] text-ink transition-[transform,color] duration-700 ease-[var(--ease-out-quint)] lg:group-hover:translate-x-6',
                active !== null && active !== i ? 'lg:text-ink/25' : '',
                large ? 'text-[clamp(2.4rem,7vw,7.5rem)]' : 'text-[clamp(2.2rem,5.6vw,5.75rem)]')}>
                {c.name}
              </span>
              {showDescriptions && <span className="col-span-3 text-[15px] leading-relaxed text-smoke lg:col-span-1">{c.description}</span>}
              <span className="label hidden text-right text-fog lg:block">{plural(c.product_count, 'piece')}</span>
              <span className="grid size-11 place-items-center justify-self-end rounded-full border border-ink/15 text-ink transition-[background-color,color,transform] duration-500 group-hover:-rotate-45 group-hover:bg-ink group-hover:text-paper">
                <Icon name="arrowRight" size={17} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div ref={preview} aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 hidden w-[17rem] opacity-0 lg:block">
        <div className="relative aspect-[4/5] overflow-hidden bg-ash shadow-[0_40px_80px_-40px_rgb(43_32_27/0.5)]">
          {categories?.map((c, i) => c.image && (
            <img key={c.id} src={c.image} alt="" loading="lazy"
              className={cn('absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out-quint)]',
                active === i ? 'scale-100 opacity-100' : 'scale-110 opacity-0')} />
          ))}
        </div>
      </div>
    </div>
  )
}
