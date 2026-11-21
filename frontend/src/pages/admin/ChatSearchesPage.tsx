import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useDocumentTitle } from '@/lib/hooks'
import { date } from '@/lib/format'
import { AdminHeader, Table, td } from '@/features/admin/ui'

interface Term { term: string; count: number; no_results: number; last_searched_at: string | null }
interface ProductRow { product_id: string; name: string; shown: number; asked: number }
interface Searches {
  keywords: Term[]
  categories: Term[]
  unmatched: Term[]
  products_shown: ProductRow[]
  products_asked: ProductRow[]
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <p className="text-sm text-smoke">{note}</p>
      </div>
      {children}
    </section>
  )
}

const empty = (cols: number, text: string) => (
  <tr><td className={`${td} text-smoke`} colSpan={cols}>{text}</td></tr>
)

function Terms({ rows, label, missLabel }: { rows: Term[]; label: string; missLabel: string }) {
  return (
    <Table head={[label, 'Searches', missLabel, 'Last searched']}>
      {rows.length ? rows.map((t) => (
        <tr key={t.term}>
          <td className={`${td} font-medium`}>{t.term}</td>
          <td className={`${td} tabular-nums`}>{t.count}</td>
          <td className={`${td} tabular-nums text-smoke`}>{t.no_results || '—'}</td>
          <td className={`${td} text-smoke`}>{t.last_searched_at ? date(t.last_searched_at) : '—'}</td>
        </tr>
      )) : empty(4, 'Nothing yet.')}
    </Table>
  )
}

function Products({ rows, by }: { rows: ProductRow[]; by: 'shown' | 'asked' }) {
  return (
    <Table head={['Piece', by === 'shown' ? 'Times shown' : 'Times asked about']}>
      {rows.length ? rows.map((p) => (
        <tr key={p.product_id}>
          <td className={td}>
            <Link to={`/admin/products/${p.product_id}`} className="underline-offset-4 hover:underline">{p.name}</Link>
          </td>
          <td className={`${td} tabular-nums`}>{p[by]}</td>
        </tr>
      )) : empty(2, 'Nothing yet.')}
    </Table>
  )
}

/** What shoppers ask Oddly Assistant for. Conversations themselves are never stored, only these counts. */
export default function ChatSearchesPage() {
  useDocumentTitle('Chat searches')
  const { data, isError } = useQuery({ queryKey: ['admin', 'chat-searches'], queryFn: () => api<Searches>('/admin/chat/searches?limit=25') })

  return (
    <div className="space-y-10">
      <AdminHeader title="Chat searches" sub="What shoppers look for in Oddly Assistant. Chats themselves aren't saved." />
      {isError && <p className="text-sm text-accent">Couldn't load the numbers. Try again in a moment.</p>}
      {data && (
        <>
          <Section title="Searched for" note="Words shoppers used to look for a piece, most searched first.">
            <Terms rows={data.keywords} label="Search" missLabel="No exact match" />
          </Section>
          <Section title="Categories" note="Kinds of pieces asked for, from the request or the search words.">
            <Terms rows={data.categories} label="Category" missLabel="Nothing found" />
          </Section>
          <Section title="Not in the shop" note="Searches with no matching piece: ideas for new products or custom work.">
            <Terms rows={data.unmatched} label="Search" missLabel="Times unmatched" />
          </Section>
          <div className="grid gap-10 lg:grid-cols-2">
            <Section title="Shown most" note="Pieces the assistant put in front of shoppers.">
              <Products rows={data.products_shown} by="shown" />
            </Section>
            <Section title="Asked about most" note="Pieces shoppers asked for details on or compared.">
              <Products rows={data.products_asked} by="asked" />
            </Section>
          </div>
        </>
      )}
    </div>
  )
}
