/** The company details we would like every operator to have filled in. */
export interface ProfileValues {
  logo_url?: string | null
  company_name?: string | null
  contact_person?: string | null
  contact_phone?: string | null
  whatsapp_number?: string | null
  email?: string | null
  legal_name?: string | null
  ssm_number?: string | null
  address_line1?: string | null
  postcode?: string | null
  city?: string | null
  state?: string | null
  bank_name?: string | null
  account_number?: string | null
  account_holder?: string | null
  payment_note?: string | null
}

export interface ProfileItem {
  /** Translation key under operator.settings.completeness.items */
  key: string
  done: boolean
  /** The form control to jump to when the operator wants to fill it in. */
  targetId: string
}

const filled = (value?: string | null) => Boolean(value && value.trim() !== '')

export function profileItems(v: ProfileValues): ProfileItem[] {
  return [
    { key: 'logo', done: filled(v.logo_url), targetId: 'logo_upload' },
    { key: 'companyName', done: filled(v.company_name), targetId: 'company_name' },
    { key: 'contactPerson', done: filled(v.contact_person), targetId: 'contact_person' },
    { key: 'contactPhone', done: filled(v.contact_phone), targetId: 'contact_phone' },
    { key: 'whatsapp', done: filled(v.whatsapp_number), targetId: 'whatsapp_number' },
    { key: 'email', done: filled(v.email), targetId: 'email' },
    { key: 'legalName', done: filled(v.legal_name), targetId: 'legal_name' },
    { key: 'ssm', done: filled(v.ssm_number), targetId: 'ssm_number' },
    {
      key: 'address',
      done: [v.address_line1, v.postcode, v.city, v.state].every(filled),
      targetId: 'address_line1',
    },
    {
      key: 'bank',
      done: [v.bank_name, v.account_number, v.account_holder].every(filled),
      targetId: 'bank_name',
    },
    { key: 'paymentNote', done: filled(v.payment_note), targetId: 'payment_note' },
  ]
}

export function completionPercent(items: ProfileItem[]): number {
  if (items.length === 0) return 100
  return Math.round((items.filter((item) => item.done).length / items.length) * 100)
}
