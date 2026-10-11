import { useState } from 'react'
import type { QuoteLine } from '@/lib/types'
import { useFilaments } from '@/lib/filaments'
import { useCart } from '@/stores/cart'
import { ColorSwatches, ColorTag } from '@/components/product/ColorSwatches'

/**
 * A bag line's colour, with a way to change it in place. Changing moves only this line (folding it into the
 * same piece in the new colour if that's already in the bag). Opens by itself when the line still needs a colour.
 */
export function LineColor({ line }: { line: QuoteLine }) {
  const setColor = useCart((s) => s.setColor)
  const { byId } = useFilaments()
  const needsChoice = line.colors.length > 0 && !line.filament
  const [open, setOpen] = useState(false)
  if (!line.colors.length) return null
  const options = line.colors.map((id) => byId.get(id)).filter((f) => !!f)
  const showing = open || needsChoice

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {line.filament ? <ColorTag filament={line.filament} className="text-[13px] text-smoke" /> : <span className="text-[13px] text-smoke">No colour chosen</span>}
        {!needsChoice && options.length > 1 && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="link-draw text-[13px] text-fog hover:text-ink">{open ? 'Done' : 'Change'}</button>
        )}
      </div>
      {showing && options.length > 0 && (
        <ColorSwatches className="mt-3" size="sm" manual label={`Colour for ${line.name}`} options={options} value={line.filament?.id ?? null}
          onChange={(id) => { setColor(line.product_id, line.color, id); setOpen(false) }} />
      )}
    </div>
  )
}
