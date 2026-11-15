import type { TransitLeg, TransitRequestStatus } from '@/api/transitPortal'

export const AFTER_SCHOOL_LEGS: TransitLeg[] = ['school_to_center', 'center_to_home']
export const BEFORE_SCHOOL_LEGS: TransitLeg[] = ['home_to_center', 'center_to_school']

/** Legs that end or start at the center and need a time the child leaves it. */
export const LEAVES_CENTER_LEGS: TransitLeg[] = ['center_to_home', 'center_to_school']

/** A date input value (YYYY-MM-DD) for today plus some days, in the viewer's own time zone. */
export function dateInput(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "12/01/2027" from "2027-01-12". */
export function showDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const transitStatusVariant: Record<TransitRequestStatus, 'success' | 'info' | 'destructive' | 'outline'> = {
  pending: 'info',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'outline',
}
