import { useState } from 'react'
import type { QuoteLine } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { VariantPicker, VariantTag } from '@/components/product/VariantPicker'

/**
 * A bag line's version (say, with or without a frame), with a way to change it in place. Changing moves only
 * this line, folding it into the same piece in that version if it's already in the bag. Opens by itself when
 * the line still needs a choice.
 */
export function LineVariant({ line }: { line: QuoteLine }) {
  const setVariant = useCart((s) => s.setVariant)
  const variants = line.variants ?? []
  const needsChoice = variants.length > 0 && !line.variant_label
  const [open, setOpen] = useState(false)
  if (!variants.length) return null
  const showing = open || needsChoice
  const name = line.variant_name || 'Option'

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {line.variant_label ? <VariantTag name={name} label={line.variant_label} className="text-[13px] text-smoke" />
          : <span className="text-[13px] text-smoke">No {name.toLowerCase()} chosen</span>}
        {!needsChoice && variants.length > 1 && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="link-draw text-[13px] text-fog hover:text-ink">{open ? 'Done' : 'Change'}</button>
        )}
      </div>
      {showing && (
        <VariantPicker className="mt-3 max-w-sm" size="sm" manual label={name} variants={variants} value={line.variant_label ? line.variant : null}
          onChange={(key) => { setVariant(line, key); setOpen(false) }} />
      )}
    </div>
  )
}
