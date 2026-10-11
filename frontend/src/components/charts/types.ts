/** One group in a breakdown. `count` is null when the group was too small to show. */
export interface Slice {
  key: string
  label: string
  count: number | null
  /** A CSS colour (usually a var(--viz-*)); charts fall back to the primary series colour. */
  color?: string
  /** A shorter label for tight axes. */
  short?: string
}

export const SERIES_COLORS = ['var(--viz-collected)', 'var(--viz-overdue)', 'var(--viz-pending)'] as const
export const NEUTRAL_COLOR = 'var(--viz-neutral)'
export const RAMP_COLORS = [
  'var(--viz-ramp-1)',
  'var(--viz-ramp-2)',
  'var(--viz-ramp-3)',
  'var(--viz-ramp-4)',
  'var(--viz-ramp-5)',
] as const

export function percentOf(count: number, base: number): number {
  return base > 0 ? Math.round((count / base) * 100) : 0
}
