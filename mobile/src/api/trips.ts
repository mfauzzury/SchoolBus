import { apiClient } from './client'

export interface TripRoute {
  id: number
  name: string
  zone: string | null
  school_destination: string | null
}

export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'
export type TripDirection = 'pickup' | 'dropoff'

export interface Trip {
  id: number
  route_id: number
  staff_id: number
  bus_id: number | null
  direction: TripDirection
  status: TripStatus
  started_at: string | null
  ended_at: string | null
  route: TripRoute
}

export interface RosterStudent {
  id: number
  full_name: string
  school_name: string
  avatar_url: string | null
  // Filled in by the parent.
  teacher_name: string | null
  class_name: string | null
  school_phone: string | null
  parent_profile: { id: number; full_name: string; phone: string; email: string } | null
  pickup_stop: { id: number; name: string; sequence: number } | null
  boarded: boolean
  alighted: boolean
}

export interface BoardingEvent {
  id: number
  trip_id: number
  student_id: number
  event_type: 'boarded' | 'alighted'
  recorded_at: string
}

export async function listTodayTrips(): Promise<Trip[]> {
  const { data } = await apiClient.get<Trip[]>('/api/driver/trips/today')
  return data
}

export async function startTrip(tripId: number): Promise<Trip> {
  const { data } = await apiClient.post<Trip>(`/api/driver/trips/${tripId}/start`)
  return data
}

export async function endTrip(tripId: number): Promise<Trip> {
  const { data } = await apiClient.post<Trip>(`/api/driver/trips/${tripId}/end`)
  return data
}

export async function getRoster(tripId: number): Promise<RosterStudent[]> {
  const { data } = await apiClient.get<RosterStudent[]>(`/api/driver/trips/${tripId}/roster`)
  return data
}

export async function boardStudent(tripId: number, studentId: number): Promise<BoardingEvent> {
  const { data } = await apiClient.post<BoardingEvent>(
    `/api/driver/trips/${tripId}/students/${studentId}/board`,
  )
  return data
}

export async function alightStudent(tripId: number, studentId: number): Promise<BoardingEvent> {
  const { data } = await apiClient.post<BoardingEvent>(
    `/api/driver/trips/${tripId}/students/${studentId}/alight`,
  )
  return data
}

export interface LocationPing {
  lat: number
  lng: number
  // Degrees, 0-360. Null when the phone can't tell which way it is moving.
  heading: number | null
  // km/h, as parents see it. Null when unknown.
  speed: number | null
}

export async function postLocation(tripId: number, ping: LocationPing): Promise<void> {
  await apiClient.post(`/api/driver/trips/${tripId}/location`, ping)
}
