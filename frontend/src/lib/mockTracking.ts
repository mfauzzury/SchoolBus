import type { BusLocation, TrackedTrip } from '@/api/tracking'

/**
 * Simulated tracking data for the GPS UI mockups. Delete this file once the
 * real endpoints exist and src/hooks/useTracking.ts calls the API instead.
 *
 * Buses loop along hand-drawn Shah Alam paths; position is a pure function of
 * the clock so every component sees the same bus in the same place.
 *
 * Append ?mock=stale | lost | none | done to the page URL to preview the
 * parent-side edge states.
 */

type LatLng = [number, number]

const PATH_A: LatLng[] = [
  [3.085, 101.54], [3.0835, 101.5372], [3.0818, 101.5345], [3.08, 101.5318],
  [3.0786, 101.529], [3.077, 101.5262], [3.0752, 101.524], [3.0735, 101.5215],
  [3.0718, 101.519], [3.0702, 101.5168],
]

const PATH_B: LatLng[] = [
  [3.06, 101.49], [3.0612, 101.4935], [3.0628, 101.4968], [3.0641, 101.5002],
  [3.0655, 101.5036], [3.0668, 101.5071], [3.069, 101.51],
]

const PATH_C: LatLng[] = [
  [3.0495, 101.5305], [3.052, 101.528], [3.0551, 101.5262], [3.0585, 101.5248],
  [3.0618, 101.5231], [3.0652, 101.5214],
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

function positionOnPath(path: LatLng[], now: number, offsetMs = 0): BusLocation {
  const progress = ((now + offsetMs) % LOOP_MS) / LOOP_MS
  const scaled = progress * (path.length - 1)
  const i = Math.min(Math.floor(scaled), path.length - 2)
  const f = scaled - i
  const [a, b] = [path[i], path[i + 1]]
  return {
    lat: a[0] + (b[0] - a[0]) * f,
    lng: a[1] + (b[1] - a[1]) * f,
    heading: bearing(a, b),
    speed: 32 + Math.round(Math.sin(now / 9000) * 8),
    recorded_at: new Date(now - 4000).toISOString(),
  }
}

/** A position frozen `ageMs` in the past — for stale/lost signal previews. */
function frozenPosition(path: LatLng[], now: number, ageMs: number): BusLocation {
  return { ...positionOnPath(path, 0, LOOP_MS / 3), speed: 0, recorded_at: new Date(now - ageMs).toISOString() }
}

function minutesAgo(now: number, minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString()
}

export type ParentMockScenario = 'live' | 'stale' | 'lost' | 'none' | 'done'

export function mockParentTrips(now: number, scenario: ParentMockScenario): TrackedTrip[] {
  const aisyahTrip: TrackedTrip = {
    id: 101,
    direction: 'pickup',
    status: 'active',
    started_at: minutesAgo(now, 18),
    ended_at: null,
    route: { id: 1, name: 'Route A — Seksyen 13' },
    bus: { id: 1, plate_number: 'WXY 4821' },
    driver: { id: 1, full_name: 'Encik Rahman Salleh', phone: '+60123456789' },
    location: positionOnPath(PATH_A, now),
    students: [{ id: 1, full_name: 'Aisyah Rahim', boarded_at: minutesAgo(now, 11), alighted_at: null }],
  }

  const adamTrip: TrackedTrip = {
    id: 102,
    direction: 'pickup',
    status: 'scheduled',
    started_at: null,
    ended_at: null,
    route: { id: 2, name: 'Route B — Kota Kemuning' },
    bus: { id: 2, plate_number: 'BKL 7730' },
    driver: { id: 2, full_name: 'Puan Norliza Ahmad', phone: '+60198765432' },
    location: null,
    students: [{ id: 2, full_name: 'Adam Rahim', boarded_at: null, alighted_at: null }],
  }

  switch (scenario) {
    case 'none':
      return [
        { ...aisyahTrip, status: 'scheduled', started_at: null, location: null, students: [{ ...aisyahTrip.students[0], boarded_at: null }] },
        adamTrip,
      ]
    case 'done':
      return [
        {
          ...aisyahTrip,
          status: 'completed',
          ended_at: minutesAgo(now, 6),
          location: frozenPosition(PATH_A, now, 6 * 60_000),
          students: [{ ...aisyahTrip.students[0], alighted_at: minutesAgo(now, 7) }],
        },
        adamTrip,
      ]
    case 'stale':
      return [{ ...aisyahTrip, location: frozenPosition(PATH_A, now, 3 * 60_000) }, adamTrip]
    case 'lost':
      return [{ ...aisyahTrip, location: frozenPosition(PATH_A, now, 9 * 60_000) }, adamTrip]
    default:
      return [aisyahTrip, adamTrip]
  }
}

export function mockOperatorTrips(now: number): TrackedTrip[] {
  const roster = (count: number, boarded: number, alighted = 0) =>
    Array.from({ length: count }, (_, i) => ({
      id: 1000 + i,
      full_name: `Student ${i + 1}`,
      boarded_at: i < boarded ? minutesAgo(now, 10) : null,
      alighted_at: i < alighted ? minutesAgo(now, 2) : null,
    }))

  return [
    {
      id: 101,
      direction: 'pickup',
      status: 'active',
      started_at: minutesAgo(now, 18),
      ended_at: null,
      route: { id: 1, name: 'Route A — Seksyen 13' },
      bus: { id: 1, plate_number: 'WXY 4821' },
      driver: { id: 1, full_name: 'Rahman Salleh', phone: '+60123456789' },
      location: positionOnPath(PATH_A, now),
      students: roster(14, 9),
      roster_count: 14,
    },
    {
      id: 103,
      direction: 'pickup',
      status: 'active',
      started_at: minutesAgo(now, 25),
      ended_at: null,
      route: { id: 3, name: 'Route C — Bukit Jelutong' },
      bus: { id: 3, plate_number: 'VFA 2194' },
      driver: { id: 3, full_name: 'Kamal Idris', phone: '+60172223344' },
      location: positionOnPath(PATH_C, now, LOOP_MS / 2),
      students: roster(18, 16),
      roster_count: 18,
    },
    {
      id: 104,
      direction: 'pickup',
      status: 'active',
      started_at: minutesAgo(now, 30),
      ended_at: null,
      route: { id: 4, name: 'Route D — Seksyen 7' },
      bus: { id: 4, plate_number: 'WTC 6602' },
      driver: { id: 4, full_name: 'Suresh Kumar', phone: '+60135556677' },
      location: frozenPosition(PATH_B, now, 3 * 60_000),
      students: roster(11, 6),
      roster_count: 11,
    },
    {
      id: 105,
      direction: 'pickup',
      status: 'active',
      started_at: minutesAgo(now, 40),
      ended_at: null,
      route: { id: 5, name: 'Route E — Setia Alam' },
      bus: { id: 5, plate_number: 'BNM 1180' },
      driver: { id: 5, full_name: 'Azlan Hashim', phone: '+60149990011' },
      location: { ...positionOnPath(PATH_C, 0), lat: 3.0905, lng: 101.4952, speed: 0, recorded_at: minutesAgo(now, 8) },
      students: roster(9, 9),
      roster_count: 9,
    },
    {
      id: 102,
      direction: 'pickup',
      status: 'scheduled',
      started_at: null,
      ended_at: null,
      route: { id: 2, name: 'Route B — Kota Kemuning' },
      bus: { id: 2, plate_number: 'BKL 7730' },
      driver: { id: 2, full_name: 'Norliza Ahmad', phone: '+60198765432' },
      location: null,
      students: roster(12, 0),
      roster_count: 12,
    },
    {
      id: 106,
      direction: 'pickup',
      status: 'completed',
      started_at: minutesAgo(now, 70),
      ended_at: minutesAgo(now, 12),
      route: { id: 6, name: 'Route F — Glenmarie' },
      bus: { id: 6, plate_number: 'WQP 3057' },
      driver: { id: 6, full_name: 'Faizal Omar', phone: '+60161112233' },
      location: null,
      students: roster(10, 10, 10),
      roster_count: 10,
    },
  ]
}
