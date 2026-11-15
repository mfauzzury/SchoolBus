import type { Student } from '../api/parent'
import type { BusLocation, TrackedTrip } from '../api/tracking'

/**
 * UI MOCKUP STAGE — simulated trips built from the parent's REAL children,
 * routes, drivers and buses; only the trip state and bus position are fake.
 * Delete once GET /api/parent/trips exists (see src/hooks/useParent.ts).
 *
 * The first route gets an active trip with a bus looping along a Shah Alam
 * path; every other route gets a not-yet-started trip.
 */

type LatLng = [number, number]

const PATH: LatLng[] = [
  [3.085, 101.54], [3.0835, 101.5372], [3.0818, 101.5345], [3.08, 101.5318],
  [3.0786, 101.529], [3.077, 101.5262], [3.0752, 101.524], [3.0735, 101.5215],
  [3.0718, 101.519], [3.0702, 101.5168],
]

const LOOP_MS = 4 * 60_000

function bearing([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function positionOnPath(now: number): BusLocation {
  const progress = (now % LOOP_MS) / LOOP_MS
  const scaled = progress * (PATH.length - 1)
  const i = Math.min(Math.floor(scaled), PATH.length - 2)
  const f = scaled - i
  const [a, b] = [PATH[i], PATH[i + 1]]
  return {
    lat: a[0] + (b[0] - a[0]) * f,
    lng: a[1] + (b[1] - a[1]) * f,
    heading: bearing(a, b),
    speed: 32 + Math.round(Math.sin(now / 9000) * 8),
    recorded_at: new Date(now - 4000).toISOString(),
  }
}

const minutesAgo = (now: number, minutes: number) => new Date(now - minutes * 60_000).toISOString()

export function mockParentTrips(students: Student[], now: number): TrackedTrip[] {
  const byRoute = new Map<number, Student[]>()
  for (const student of students) {
    if (!student.route || student.enrollment_status !== 'active') continue
    byRoute.set(student.route.id, [...(byRoute.get(student.route.id) ?? []), student])
  }

  return [...byRoute.values()].map((riders, index) => {
    const route = riders[0].route!
    const active = index === 0
    return {
      id: route.id,
      direction: 'pickup',
      status: active ? 'active' : 'scheduled',
      started_at: active ? minutesAgo(now, 18) : null,
      ended_at: null,
      route: { id: route.id, name: route.name },
      bus: route.bus ? { id: route.bus.id, plate_number: route.bus.plate_number } : null,
      driver: route.driver
        ? { id: route.driver.id, full_name: route.driver.full_name, phone: route.driver.phone }
        : null,
      location: active ? positionOnPath(now) : null,
      students: riders.map((student) => ({
        id: student.id,
        full_name: student.full_name,
        boarded_at: active ? minutesAgo(now, 11) : null,
        alighted_at: null,
      })),
    }
  })
}
