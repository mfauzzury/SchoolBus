import { apiClient } from './client'
import type { TransitLeg, TransitPrices } from './billingConfig'

/** The logged-in transit center, as it sees itself. */
export interface MyTransitCenter {
  id: number
  name: string
  contact_person: string | null
  phone: string
  email: string
  address: string | null
  operator: { company_name: string; contact_phone: string | null; email: string | null }
  /** Indicative monthly price per leg, set by the bus operator. */
  transit_prices: TransitPrices
}

export async function getMyCenter(): Promise<MyTransitCenter> {
  const { data } = await apiClient.get<MyTransitCenter>('/api/transit/center')
  return data
}

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

export interface TransitRequestInput {
  student_id: number
  legs: TransitLeg[]
  center_after_stop_id: number | null
  starts_on: string
  leave_center_at: string | null
  note: string | null
}

export async function searchTransitStudents(q: string): Promise<TransitStudentSummary[]> {
  const { data } = await apiClient.get<TransitStudentSummary[]>('/api/transit/students', { params: { q } })
  return data
}

export async function getTransitStudent(id: number): Promise<TransitStudent> {
  const { data } = await apiClient.get<TransitStudent>(`/api/transit/students/${id}`)
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

export async function createTransitStopRequest(input: {
  student_id: number
  ends_on: string
  note: string | null
}): Promise<MyTransitRequest> {
  const { data } = await apiClient.post<MyTransitRequest>('/api/transit/requests/stop', input)
  return data
}

export async function cancelTransitRequest(id: number): Promise<MyTransitRequest> {
  const { data } = await apiClient.post<MyTransitRequest>(`/api/transit/requests/${id}/cancel`)
  return data
}
