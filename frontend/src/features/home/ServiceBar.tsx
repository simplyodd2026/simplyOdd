import { useConfig } from '@/lib/queries'
import { money } from '@/lib/format'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Reveal } from '@/components/motion/Reveal'

/** The four promises a shopper looks for before buying, in one quiet row. */
export function ServiceBar() {
  const { data: config } = useConfig()
  const items: [IconName, string, string][] = [
    ['truck', 'Free shipping', `On orders over ${money(config?.free_shipping_threshold ?? 1999)}`],
    ['layers', 'Made to order', 'Printed and finished by hand'],
    ['returns', '14-day returns', 'On unused pieces'],
    ['shield', 'Secure checkout', 'Pay online or cash on delivery'],
  ]
  return (
    <section className="border-y border-rule">
      <Reveal stagger={0.06} y={16} className="mx-auto grid max-w-[1520px] grid-cols-2 lg:grid-cols-4">
        {items.map(([icon, title, body], i) => (
          <div key={title} className={`flex items-center gap-4 px-5 py-6 sm:px-8 lg:px-10 ${i % 2 ? '' : 'border-r border-rule'} ${i < 2 ? 'border-b border-rule lg:border-b-0' : ''} lg:border-r lg:last:border-r-0`}>
            <Icon name={icon} size={22} className="shrink-0 text-ink" />
            <div>
              <p className="text-[14px] font-medium text-ink">{title}</p>
              <p className="text-[13px] text-fog">{body}</p>
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
