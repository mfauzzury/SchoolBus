import { useMemo, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endTrip, getRoster, listTodayTrips, startTrip, type RosterStudent } from '../api/trips'
import { getVersion, subscribe, unsentFor } from '../lib/boardingQueue'

export function useTodayTrips() {
  return useQuery({ queryKey: ['trips', 'today'], queryFn: listTodayTrips })
}

export function useStartTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tripId: number) => startTrip(tripId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', 'today'] }),
  })
}

export function useEndTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tripId: number) => endTrip(tripId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', 'today'] }),
  })
}

export function useRoster(tripId: number) {
  return useQuery({ queryKey: ['trips', tripId, 'roster'], queryFn: () => getRoster(tripId) })
}

/**
 * The roster as the driver should see it: the server's list with any taps that
 * have not been sent yet laid on top, so a tap shows at once even with no signal.
 */
export function useBoardingRoster(tripId: number) {
  const query = useRoster(tripId)
  const version = useSyncExternalStore(subscribe, getVersion)

  const { students, unsent } = useMemo(() => {
    const overlay = unsentFor(tripId)
    return {
      unsent: overlay.size,
      students: query.data?.map<RosterStudent>((student) => {
        const status = overlay.get(student.id)
        return status
          ? {
              ...student,
              status,
              boarded: status === 'boarded' || status === 'alighted',
              alighted: status === 'alighted',
              absent: status === 'absent',
            }
          : student
      }),
    }
    // `version` changes whenever the unsent taps do.
  }, [query.data, tripId, version])

  return { ...query, students, unsent }
}
