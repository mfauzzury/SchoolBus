import { apiClient } from './client'

/** The logged-in transit center, as it sees itself. */
export interface MyTransitCenter {
  id: number
  name: string
  contact_person: string | null
  phone: string
  email: string
  address: string | null
  operator: { company_name: string; contact_phone: string | null; email: string | null }
  /** What the bus operator charges a child per month for going via this center; null = not set yet. */
  monthly_price: number | null
}

export async function getMyCenter(): Promise<MyTransitCenter> {
  const { data } = await apiClient.get<MyTransitCenter>('/api/transit/center')
  return data
}

/** Counts for the start page: who the bus carries to the center now. No names, no fees. */
export interface TransitStats {
  students: number
  waiting: number
  by_school: { name: string | null; count: number }[]
  by_age: { age: number; count: number }[]
  by_gender: { male: number; female: number; unknown: number }
}

export async function getTransitStats(): Promise<TransitStats> {
  const { data } = await apiClient.get<TransitStats>('/api/transit/center/stats')
  return data
}

/** The parts of a child's day a transit center can ask the bus to cover: the route flow, not price categories. */
export type TransitLeg = 'school_to_center' | 'center_to_home' | 'home_to_center' | 'center_to_school'

export type TransitStatusHere = 'pending' | 'active' | null

/** A child as a center sees them in search results: enough to recognise, no fees. */
export interface TransitStudentSummary {
  id: number
  full_name: string
  school_name: string | null
  class_name: string | null
  parent_name: string | null
  /** Last 4 digits of the parent's phone. */
  parent_phone_end: string | null
  route_name: string | null
  status_here: TransitStatusHere
}

export interface TransitPlan {
  request_id: number
  legs: TransitLeg[]
  starts_on: string | null
  ends_on: string | null
  monthly_amount: string | null
}

export interface TransitStudent extends TransitStudentSummary {
  pickup_stop_id: number | null
  route: {
    id: number
    name: string
    session: 'morning' | 'afternoon' | null
    school_destination: string | null
    stops: { id: number; name: string; sequence: number; is_this_center: boolean }[]
  } | null
  plan: TransitPlan | null
}

export interface TransitChild extends TransitPlan {
  student: { id: number; full_name: string; school_name: string | null; class_name: string | null }
  stop_pending: boolean
}

export type TransitRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface MyTransitRequest {
  id: number
  kind: 'start' | 'stop'
  status: TransitRequestStatus
  student: { id: number; full_name: string; school_name: string | null }
  legs: TransitLeg[] | null
  starts_on: string | null
  ends_on: string | null
  leave_center_at: string | null
  note: string | null
  indicative_amount: string | null
  approved_amount: string | null
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
}

/** A center only names the child; the operator decides the bus, days and price. */
export interface TransitRequestInput {
  student_id: number
}

export async function searchTransitStudents(q: string): Promise<TransitStudentSummary[]> {
  const { data } = await apiClient.get<TransitStudentSummary[]>('/api/transit/students', { params: { q } })
  return data
}

export async function listTransitChildren(): Promise<TransitChild[]> {
  const { data } = await apiClient.get<TransitChild[]>('/api/transit/children')
  return data
}

export async function listMyTransitRequests(): Promise<MyTransitRequest[]> {
  const { data } = await apiClient.get<MyTransitRequest[]>('/api/transit/requests')
  return data
}

export async function createTransitRequest(input: TransitRequestInput): Promise<MyTransitRequest> {
  const { data } = await apiClient.post<MyTransitRequest>('/api/transit/requests', input)
  return data
}

export async function cancelTransitRequest(id: number): Promise<MyTransitRequest> {
  const { data } = await apiClient.post<MyTransitRequest>(`/api/transit/requests/${id}/cancel`)
  return data
}

/** A running transit center plan: what the bus does, on which bus, and the monthly extra. */
export interface TransitPlanSummary {
  request_id: number
  transit_center: { id: number; name: string; phone: string | null; latitude: number | null; longitude: number | null } | null
  legs: TransitLeg[]
  starts_on: string | null
  ends_on: string | null
  monthly_amount: string | null
  leave_center_at: string | null
  rides: {
    direction: 'pickup' | 'dropoff'
    /** Null means the school. */
    from: string | null
    to: string | null
    route: string | null
    bus_plate: string | null
    driver: { full_name: string; phone: string | null } | null
  }[]
}
