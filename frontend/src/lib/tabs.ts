import { cn } from '@/lib/utils'

/** The pill-shaped tab strip used across the operator pages (Settings, Finances, a student). */
export const pillTabListClass = 'inline-flex w-fit items-center rounded-full border p-0.5 text-sm'

export function pillTabClass(active: boolean) {
  return cn(
    'rounded-full px-2.5 py-1 font-medium whitespace-nowrap transition-colors',
    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  )
}
