import { useState } from 'react'
import type { AddressInput } from '@/lib/types'
import { Input, Select, Checkbox } from '@/components/ui/Field'

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

export const emptyAddress = (name = ''): AddressInput => ({
  label: 'Home', full_name: name, phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India', is_default: false,
})

export type AddressErrors = Partial<Record<keyof AddressInput | 'email', string>>

export function validateAddress(a: AddressInput & { email?: string }, needEmail = false): AddressErrors {
  const e: AddressErrors = {}
  if (!a.full_name.trim()) e.full_name = 'Enter the recipient’s name'
  if (!/^[+\d][\d\s-]{7,15}$/.test(a.phone.trim())) e.phone = 'Enter a phone number the courier can call'
  if (needEmail && !/^\S+@\S+\.\S+$/.test(a.email ?? '')) e.email = 'Enter an email for order updates'
  if (!a.line1.trim()) e.line1 = 'Enter a house number and street'
  if (!a.city.trim()) e.city = 'Enter a city'
  if (!a.state.trim()) e.state = 'Choose a state'
  if (a.country === 'India' ? !/^\d{6}$/.test(a.postal_code.trim()) : a.postal_code.trim().length < 3) e.postal_code = a.country === 'India' ? 'PIN codes have 6 digits' : 'Enter a postal code'
  return e
}

export function AddressFields({ value, onChange, errors = {}, tone = 'dark', showLabel = true, showDefault = false }: {
  value: AddressInput; onChange: (a: AddressInput) => void; errors?: AddressErrors; tone?: 'dark' | 'light'
  showLabel?: boolean; showDefault?: boolean
}) {
  const set = <K extends keyof AddressInput>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input tone={tone} label="Full name" autoComplete="name" value={value.full_name} onChange={set('full_name')} error={errors.full_name} />
      <Input tone={tone} label="Phone" type="tel" autoComplete="tel" value={value.phone} onChange={set('phone')} error={errors.phone} />
      <Input tone={tone} className="sm:col-span-2" label="Address" autoComplete="address-line1" placeholder="House number and street"
        value={value.line1} onChange={set('line1')} error={errors.line1} />
      <Input tone={tone} className="sm:col-span-2" label="Apartment, landmark (optional)" autoComplete="address-line2" value={value.line2} onChange={set('line2')} />
      <Input tone={tone} label="City" autoComplete="address-level2" value={value.city} onChange={set('city')} error={errors.city} />
      {value.country === 'India' ? (
        <Select tone={tone} label="State" autoComplete="address-level1" value={value.state} onChange={set('state')} error={errors.state}>
          <option value="">Choose a state</option>
          {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      ) : (
        <Input tone={tone} label="State / region" value={value.state} onChange={set('state')} error={errors.state} />
      )}
      <Input tone={tone} label="PIN code" inputMode="numeric" autoComplete="postal-code" value={value.postal_code} onChange={set('postal_code')} error={errors.postal_code} />
      <Select tone={tone} label="Country" autoComplete="country-name" value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value, state: '' })}>
        <option>India</option>
      </Select>
      {showLabel && <Input tone={tone} label="Label" placeholder="Home, Studio…" value={value.label} onChange={set('label')} />}
      {showDefault && (
        <div className="flex items-end pb-2.5">
          <Checkbox label="Make this my default address" checked={value.is_default} onChange={(e) => onChange({ ...value, is_default: e.target.checked })} />
        </div>
      )}
    </div>
  )
}

export function useAddressState(initial: AddressInput) {
  const [value, setValue] = useState(initial)
  const [errors, setErrors] = useState<AddressErrors>({})
  return { value, setValue, errors, setErrors }
}
