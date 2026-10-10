import { apiClient } from './client'

export interface OperatorStudentApplication {
  id: number
  full_name: string
  date_of_birth: string
  school_name: string
  package_type: 'one_way' | 'return'
  status: 'pending' | 'approved' | 'rejected'
  route_id: number | null
  fee_override: string | null
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
  parent_profile: { id: number; full_name: string; phone: string; email: string } | null
  route: { id: number; name: string } | null
}

export interface ApplicationFilters {
  status?: string
}

export interface ApproveApplicationInput {
  route_id: number
  school_name: string
  fee_override?: number | null
  pickup_stop_id?: number | null
  billing_start?: 'this_month' | 'next_month'
  // What to charge for the first month instead of the full fee (mid-month join).
  first_month_amount?: number | null
}

export interface RejectApplicationInput {
  rejection_reason: string
}

export async function listStudentApplications(
  filters: ApplicationFilters,
): Promise<OperatorStudentApplication[]> {
  const { data } = await apiClient.get<OperatorStudentApplication[]>('/api/operator/student-applications', {
    params: filters,
  })
  return data
}

export async function getStudentApplication(id: number): Promise<OperatorStudentApplication> {
  const { data } = await apiClient.get<OperatorStudentApplication>(
    `/api/operator/student-applications/${id}`,
  )
  return data
}

export async function approveStudentApplication(
  id: number,
  input: ApproveApplicationInput,
): Promise<OperatorStudentApplication> {
  const { data } = await apiClient.post<OperatorStudentApplication>(
    `/api/operator/student-applications/${id}/approve`,
    input,
  )
  return data
}

export async function rejectStudentApplication(
  id: number,
  input: RejectApplicationInput,
): Promise<OperatorStudentApplication> {
  const { data } = await apiClient.post<OperatorStudentApplication>(
    `/api/operator/student-applications/${id}/reject`,
    input,
  )
  return data
}
