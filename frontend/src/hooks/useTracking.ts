import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mockOperatorTrips, mockParentTrips, type ParentMockScenario } from '@/lib/mockTracking'
import type { TrackedTrip } from '@/api/tracking'

/**
 * UI MOCKUP STAGE — these return simulated data. When the backend endpoints
 * land, replace each body with a useQuery({ refetchInterval: 10_000 }) call;
 * the { data, isLoading } shape is kept so pages don't change.
 */

const TICK_MS = 2000

/** Re-renders every TICK_MS so "updated Xs ago" labels and simulated buses advance. */
export function useNow(intervalMs = TICK_MS): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function mockScenario(): ParentMockScenario {
  const value = new URLSearchParams(window.location.search).get('mock')
  return value === 'stale' || value === 'lost' || value === 'none' || value === 'done' ? value : 'live'
}

export function useParentTrips(): { data: TrackedTrip[] | undefined; isLoading: boolean } {
  const now = useNow()
  return { data: mockParentTrips(now, mockScenario()), isLoading: false }
}

export function useOperatorTrips(): { data: TrackedTrip[] | undefined; isLoading: boolean } {
  const now = useNow()
  return { data: mockOperatorTrips(now), isLoading: false }
}

/** Clock times and "Xs / X min ago" labels in the active UI language. */
export function useTimeFormat() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ms' ? 'ms-MY' : 'en-MY'
  return {
    time: (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
    ago: (iso: string, now: number) => {
      const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
      return seconds < 60
        ? t('tracking.ago.seconds', { count: seconds })
        : t('tracking.ago.minutes', { count: Math.floor(seconds / 60) })
    },
  }
}
