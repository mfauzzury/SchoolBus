import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  alightStudent,
  boardStudent,
  endTrip,
  getRoster,
  listTodayTrips,
  startTrip,
} from '../api/trips'

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

export function useBoardStudent(tripId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => boardStudent(tripId, studentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'roster'] }),
  })
}

export function useAlightStudent(tripId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => alightStudent(tripId, studentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'roster'] }),
  })
}
