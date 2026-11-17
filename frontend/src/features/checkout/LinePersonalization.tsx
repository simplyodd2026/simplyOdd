import { useState } from 'react'
import type { Personalization, QuoteLine } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { Button } from '@/components/ui/Button'
import { PersonalizationForm, PersonalizationTag, personalizationErrors } from '@/components/product/Personalization'

/**
 * What's written on a bag line, with a way to change it in place. Opens by itself when the piece still needs
 * something written on it (say it was added from a product card), so the bag can always be put right.
 */
export function LinePersonalization({ line }: { line: QuoteLine }) {
  const setPersonalization = useCart((s) => s.setPersonalization)
  const fields = line.personalization_fields ?? []
  const missing = fields.length > 0 && Object.keys(personalizationErrors(fields, line.personalization ?? {})).length > 0
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Personalization>(line.personalization ?? {})
  const [tried, setTried] = useState(false)
  if (!fields.length) return null
  const editing = open || missing
  const errors = personalizationErrors(fields, draft)

  const save = () => {
    if (Object.keys(errors).length) { setTried(true); return }
    setPersonalization(line, draft)
    setOpen(false)
    setTried(false)
  }

  return (
    <div className="mt-2">
      {!editing ? (
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <PersonalizationTag details={line.personalization_details} className="text-[13px] text-smoke" />
          {!line.personalization_details.length && <span className="text-[13px] text-smoke">Not personalised</span>}
          <button type="button" onClick={() => { setDraft(line.personalization ?? {}); setOpen(true) }}
            className="link-draw text-[13px] text-fog hover:text-ink">Edit</button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-3 rounded-md border border-rule p-4">
          <PersonalizationForm fields={fields} fee={line.personalization_fee} values={draft} onChange={setDraft}
            errors={tried ? errors : undefined} />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={save}>Save</Button>
            {!missing && <button type="button" onClick={() => setOpen(false)} className="link-draw text-[13px] text-fog hover:text-ink">Cancel</button>}
          </div>
        </div>
      )}
    </div>
  )
}
