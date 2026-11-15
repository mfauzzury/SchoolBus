import { useCallback, useEffect, useState } from 'react'
import { startTracking, trackedTripId, type StartResult } from '../lib/tripTracking'

export type SharingState = 'starting' | StartResult

/**
 * Makes sure the bus position is being shared while this trip is in progress.
 * Safe to run on every visit to the trip screen: if this trip is already being
 * shared it does nothing. Leaving the screen does NOT stop sharing — the bus
 * keeps moving; ending the trip (or logging out) is what stops it.
 */
export function useTripTracking(tripId: number, tripInProgress: boolean) {
  const [state, setState] = useState<SharingState>('starting')

  const start = useCallback(async () => {
    setState('starting')
    setState((await trackedTripId()) === tripId ? 'sharing' : await startTracking(tripId))
  }, [tripId])

  useEffect(() => {
    if (tripInProgress) void start()
  }, [tripInProgress, start])

  return { state, retry: start }
}
