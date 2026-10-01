import { Checkbox } from '@/components/ui/Field'
import type { PaymentAdapter } from './types'

type State = { decline: boolean }

export const mockAdapter: PaymentAdapter<State> = {
  id: 'mock',
  initialState: { decline: false },
  cta: (amount) => `Pay ${amount}`,
  Panel: ({ value, onChange }) => (
    <div className="mt-4 flex flex-col gap-4 border border-dashed border-rule p-4 text-sm">
      <p className="text-smoke">Test mode. No card is charged and no money moves.</p>
      <div className="grid grid-cols-2 gap-3 text-graphite/80">
        <div className="col-span-2 border border-rule px-3 py-2.5 tabular-nums">4242 4242 4242 4242</div>
        <div className="border border-rule px-3 py-2.5 tabular-nums">12 / 30</div>
        <div className="border border-rule px-3 py-2.5 tabular-nums">123</div>
      </div>
      <Checkbox label="Simulate a declined card" checked={value.decline} onChange={(e) => onChange({ decline: e.target.checked })} />
    </div>
  ),
  collect: async (_payment, state) => {
    await new Promise((r) => setTimeout(r, 700))
    return { outcome: state.decline ? 'failure' : 'success' }
  },
}
