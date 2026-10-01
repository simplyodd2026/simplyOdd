import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function AdminHeader({ title, actions, sub }: { title: string; actions?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
      <div>
        <h1 className="text-4xl font-black leading-none w-cond sm:text-5xl">{title}</h1>
        {sub && <p className="mt-2 text-smoke">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto border border-rule', className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-rule bg-paper-2 text-fog">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-rule">{children}</tbody>
      </table>
    </div>
  )
}

export const td = 'px-4 py-3 align-middle'

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-rule pt-4">
      <span className="text-sm text-smoke">{label}</span>
      <span className="text-4xl font-black tabular-nums leading-none w-cond">{value}</span>
      {note && <span className="text-sm text-fog">{note}</span>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
      className="h-10 w-full max-w-xs rounded-xl border border-rule bg-transparent px-3 text-sm outline-none placeholder:text-fog focus:border-accent" />
  )
}

export function FilterSelect({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: [string, string][]; label: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className="h-10 rounded-xl border border-rule bg-transparent px-3 text-sm outline-none focus:border-accent ">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
