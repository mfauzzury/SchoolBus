/**
 * Live bus tracking types — the shape the parent/operator tracking endpoints
 * will return. Only the bus position is tracked (no stop geometry, no ETA).
 *
 * UI MOCKUP STAGE: there are no backend endpoints yet. The hooks in
 * src/hooks/useTracking.ts serve simulated data from src/lib/mockTracking.ts;
 * swapping them to real apiClient calls should need no UI changes.
 */

export type TrackedTripStatus = 'scheduled' | 'active' | 'completed'
export type TrackedTripDirection = 'pickup' | 'dropoff'

export interface BusLocation {
  lat: number
  lng: number
  heading: number | null
  speed: number | null
  recorded_at: string
}

export interface TrackedStudent {
  id: number
  full_name: string
  boarded_at: string | null
  alighted_at: string | null
}

export interface TrackedTrip {
  id: number
  direction: TrackedTripDirection
  status: TrackedTripStatus
  started_at: string | null
  ended_at: string | null
  route: { id: number; name: string }
  bus: { id: number; plate_number: string } | null
  driver: { id: number; full_name: string; phone: string } | null
  location: BusLocation | null
  /** Parent endpoint: only the parent's own children. Operator endpoint: the full roster. */
  students: TrackedStudent[]
  /** Operator endpoint only — roster size, since `students` may be trimmed. */
  roster_count?: number
}

export type SignalState = 'live' | 'stale' | 'lost' | 'none'

/** >2 min without a ping is "stale", >5 min is "lost" (driver app likely closed or offline). */
export function signalState(location: BusLocation | null, now = Date.now()): SignalState {
  if (!location) return 'none'
  const ageMs = now - new Date(location.recorded_at).getTime()
  if (ageMs > 5 * 60_000) return 'lost'
  if (ageMs > 2 * 60_000) return 'stale'
  return 'live'
}
