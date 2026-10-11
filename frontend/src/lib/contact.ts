/** A wa.me link for a Malaysian phone number typed any usual way (012-345 6789, +6012…, 6012…). */
export function whatsappLink(phone: string): string | null {
  const digits = phone.replace(/\D+/g, '')
  if (digits.length < 8) return null

  const international = digits.startsWith('60') ? digits : digits.startsWith('0') ? `6${digits}` : digits
  return `https://wa.me/${international}`
}

/** <input type="datetime-local"> value (local time) from an ISO timestamp. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** ISO timestamp from a datetime-local value, or null when empty. */
export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

/** The office address on one line, or null when none was filled in. */
export function formatAddress(parts: {
  address_line1?: string | null
  address_line2?: string | null
  postcode?: string | null
  city?: string | null
  state?: string | null
}): string | null {
  const joined = [
    parts.address_line1,
    parts.address_line2,
    [parts.postcode, parts.city].filter(Boolean).join(' '),
    parts.state,
  ]
    .filter((part) => part && part.trim() !== '')
    .join(', ')

  return joined || null
}

export const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis',
  'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
  'Kuala Lumpur', 'Labuan', 'Putrajaya',
] as const
