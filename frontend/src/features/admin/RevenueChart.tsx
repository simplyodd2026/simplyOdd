import { useState } from 'react'
import { money, date } from '@/lib/format'

/** Single-series daily revenue. Bars are thin, rounded at the data end,
 *  anchored to a zero baseline, with a per-bar tooltip and a table view. */
const BAR = '#4A6396' // brand denim accent, well over 3:1 on the white surface

export function RevenueChart({ series }: { series: { date: string; revenue: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)
  const W = 720, H = 220, PAD_L = 56, PAD_B = 24, PAD_T = 12
  const max = Math.max(1, ...series.map((d) => d.revenue))
  const nice = niceCeil(max)
  const plotW = W - PAD_L, plotH = H - PAD_B - PAD_T
  const step = plotW / series.length
  const barW = Math.max(2, step - 2) // 2px surface gap between bars
  const y = (v: number) => PAD_T + plotH - (v / nice) * plotH
  const ticks = [0, nice / 2, nice]
  const total = series.reduce((n, d) => n + d.revenue, 0)

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Revenue by day</h2>
        <button onClick={() => setAsTable(!asTable)} className="text-sm text-smoke underline underline-offset-4 hover:text-ink">
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-y-auto border border-rule">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-paper-2 text-fog"><tr><th className="px-3 py-2 text-left font-medium">Date</th><th className="px-3 py-2 text-right font-medium">Revenue</th></tr></thead>
            <tbody className="divide-y divide-rule">
              {series.filter((d) => d.revenue > 0).reverse().map((d) => (
                <tr key={d.date}><td className="px-3 py-2">{date(d.date)}</td><td className="px-3 py-2 text-right tabular-nums">{money(d.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Daily revenue over ${series.length} days, total ${money(total)}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} stroke="#E8E3DF" strokeWidth="1" />
                <text x={PAD_L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#737373">{compact(t)}</text>
              </g>
            ))}
            {series.map((d, i) => {
              const x = PAD_L + i * step + 1
              const h = Math.max(0, y(0) - y(d.revenue))
              const r = Math.min(4, barW / 2, h)
              return (
                <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={PAD_L + i * step} y={PAD_T} width={step} height={plotH} fill="transparent" />
                  {h > 0 && (
                    <path d={`M${x},${y(0)} V${y(d.revenue) + r} q0,-${r} ${r},-${r} h${barW - 2 * r} q${r},0 ${r},${r} V${y(0)} Z`}
                      fill={BAR} opacity={hover === null || hover === i ? 1 : 0.45} />
                  )}
                </g>
              )
            })}
            {[0, Math.floor(series.length / 2), series.length - 1].map((i) => series[i] && (
              <text key={i} x={PAD_L + i * step + step / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#737373">
                {date(series[i].date, { day: 'numeric', month: 'short' })}
              </text>
            ))}
          </svg>
          {hover !== null && series[hover] && (
            <div className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap border border-rule bg-paper-3 px-3 py-2 text-sm shadow-xl"
              style={{ left: `${((PAD_L + hover * step + step / 2) / W) * 100}%` }}>
              <div className="text-fog">{date(series[hover].date)}</div>
              <div className="tabular-nums text-ink">{money(series[hover].revenue)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function niceCeil(v: number) {
  const p = 10 ** Math.floor(Math.log10(v))
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((n) => n >= v) ?? v
}
const compact = (v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `₹${v}`)
