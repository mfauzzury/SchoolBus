import axios from 'axios'
import { queryClient } from '../api/queryClient'
import { setStudentStatus, type RosterStudent, type StudentStatus } from '../api/trips'

/**
 * Taps on the trip screen are applied on screen straight away and sent from
 * here, so a bus with no signal still feels normal. A tap that could not be
 * sent is kept and tried again every few seconds until it gets through.
 *
 * Each tap says where the child should be ("boarded"), not what just happened,
 * and a newer tap for the same child replaces the older one. So an undo made
 * while offline simply replaces the tap, and nothing is ever applied twice.
 *
 * The queue lives in memory: if the app is closed with taps still unsent, those
 * taps are lost and the screen shows the server's version next time.
 */

interface Entry {
  tripId: number
  studentId: number
  status: StudentStatus
}

const RETRY_MS = 8000

const pending = new Map<string, Entry>()
const listeners = new Set<() => void>()
let version = 0
let flushing = false
let retryTimer: ReturnType<typeof setTimeout> | null = null

const keyOf = (tripId: number, studentId: number) => `${tripId}:${studentId}`

function changed() {
  version++
  listeners.forEach((listener) => listener())
}

/** For useSyncExternalStore. */
export const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export const getVersion = () => version

/** The taps for this trip that the server has not confirmed yet, by child. */
export function unsentFor(tripId: number): Map<number, StudentStatus> {
  const result = new Map<number, StudentStatus>()
  for (const entry of pending.values()) if (entry.tripId === tripId) result.set(entry.studentId, entry.status)
  return result
}

export function queueStatus(tripId: number, studentId: number, status: StudentStatus): void {
  pending.set(keyOf(tripId, studentId), { tripId, studentId, status })
  changed()
  void flush()
}

/** Keeps the roster on screen right after a confirmed tap, before it is fetched again. */
function applyToRoster({ tripId, studentId, status }: Entry) {
  queryClient.setQueryData<RosterStudent[]>(['trips', tripId, 'roster'], (roster) =>
    roster?.map((student) =>
      student.id === studentId
        ? {
            ...student,
            status,
            boarded: status === 'boarded' || status === 'alighted',
            alighted: status === 'alighted',
            absent: status === 'absent',
          }
        : student,
    ),
  )
}

export async function flush(): Promise<void> {
  if (flushing) return
  flushing = true
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null

  const touchedTrips = new Set<number>()
  let offline = false

  try {
    while (pending.size > 0 && !offline) {
      for (const [key, entry] of [...pending]) {
        try {
          await setStudentStatus(entry.tripId, entry.studentId, entry.status)
          applyToRoster(entry)
        } catch (error) {
          if (!(axios.isAxiosError(error) && error.response)) {
            // No answer at all: no signal. Keep everything and try again later.
            offline = true
            break
          }
          // The server answered "no" (not your trip, not on this route). Trying again
          // would not help; the screen goes back to what the server says.
        }

        touchedTrips.add(entry.tripId)
        // A newer tap for the same child may have replaced this one while it was sending.
        if (pending.get(key) === entry) pending.delete(key)
        changed()
      }
    }
  } finally {
    flushing = false
  }

  for (const tripId of touchedTrips) queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'roster'] })

  if (pending.size > 0) retryTimer = setTimeout(() => void flush(), RETRY_MS)
}
