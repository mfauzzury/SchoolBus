import { apiClient } from './client'
import type { TransitLeg, TransitRequestStatus } from './transitPortal'
import type { RouteStop } from './routes'

/** A transit center's request, as the operator sees it. */
export interface OperatorTransitRequest {
  id: number
  kind: 'start' | 'stop'
  status: TransitRequestStatus
  legs: TransitLeg[] | null
  center_after_stop_id: number | null
  leave_center_at: string | null
  note: string | null
  starts_on: string | null
  ends_on: string | null
  indicative_amount: string | null
  approved_amount: string | null
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  transit_center: { id: number; name: string; phone?: string; contact_person?: string | null; address?: string | null }
  student: {
    id: number
    full_name: string
    school_name: string | null
    route_id?: number | null
    pickup_stop_id?: number | null
    parent_profile: { id: number; full_name: string; phone: string | null; email?: string | null } | null
    pickup_stop?: RouteStop | null
  }
}

export interface RunningPlan {
  id: number
  transit_center: string | null
  legs: TransitLeg[]
  starts_on: string | null
  ends_on: string | null
  monthly_amount: string | null
}

export interface OperatorTransitRequestDetail extends OperatorTransitRequest {
  center_after_stop: RouteStop | null
  reviewer: { id: number; name: string } | null
  running_plans: RunningPlan[]
}

export interface LegPlan {
  leg: TransitLeg
  route_id: number
  center_after_stop_id: number | null
  home_stop_id: number | null
}

export type ApproveTransitInput =
  | { monthly_amount: number; starts_on: string; bill_from: 'start_month' | 'next_month'; legs: LegPlan[] }
  | { ends_on: string }

/** What approving did to bills already made: months (YYYY-MM-01) changed, and paid ones left alone. */
export interface TransitBillingResult {
  added: string[]
  not_changed: string[]
}

export async function listTransitRequests(status?: string): Promise<OperatorTransitRequest[]> {
  const { data } = await apiClient.get<OperatorTransitRequest[]>('/api/operator/transit-requests', {
    params: status ? { status } : undefined,
  })
  return data
}

export async function getTransitRequest(id: number): Promise<OperatorTransitRequestDetail> {
  const { data } = await apiClient.get<OperatorTransitRequestDetail>(`/api/operator/transit-requests/${id}`)
  return data
}

export async function approveTransitRequest(
  id: number,
  input: ApproveTransitInput,
): Promise<OperatorTransitRequestDetail & { billing: TransitBillingResult }> {
  const { data } = await apiClient.post<OperatorTransitRequestDetail & { billing: TransitBillingResult }>(`/api/operator/transit-requests/${id}/approve`, input)
  return data
}

export async function rejectTransitRequest(id: number, rejection_reason: string): Promise<OperatorTransitRequestDetail> {
  const { data } = await apiClient.post<OperatorTransitRequestDetail>(`/api/operator/transit-requests/${id}/reject`, {
    rejection_reason,
  })
  return data
}
