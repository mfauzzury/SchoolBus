import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listMyInvoices, listMyStudents } from '../api/parent'
import { mockParentTrips } from '../lib/mockTracking'
import type { TrackedTrip } from '../api/tracking'

export function useMyStudents() {
  return useQuery({ queryKey: ['my-students'], queryFn: listMyStudents })
}

export function useMyInvoices() {
  return useQuery({ queryKey: ['my-invoices'], queryFn: listMyInvoices })
}

/** Re-renders every `intervalMs` so "updated Xs ago" labels and the simulated bus advance. */
export function useNow(intervalMs = 2000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * UI MOCKUP STAGE — replace with
 *   useQuery({ queryKey: ['parent-trips'], queryFn: listMyTrips, refetchInterval: 10_000 })
 * once the backend endpoint exists. The { data, isLoading } shape stays the same.
 */
export function useParentTrips(now: number): { data: TrackedTrip[] | undefined; isLoading: boolean } {
  const { data: students, isLoading } = useMyStudents()
  return { data: students ? mockParentTrips(students, now) : undefined, isLoading }
}
