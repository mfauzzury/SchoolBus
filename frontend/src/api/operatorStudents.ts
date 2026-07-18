import { apiClient } from './client'

export interface OperatorStudentInvoice {
  id: number
  status: 'draft' | 'issued' | 'paid' | 'overdue'
  final_amount: string
  due_date: string
}

export interface OperatorStudent {
  id: number
  full_name: string
  date_of_birth: string
  school_name: string
  package_type: 'one_way' | 'return'
  billing_period: string
  enrollment_status: 'active' | 'suspended' | 'withdrawn'
  parent_profile: { id: number; full_name: string; phone: string; email: string } | null
  route: { id: number; name: string } | null
  pickup_stop: { id: number; name: string } | null
  invoices: OperatorStudentInvoice[]
}

export interface StudentFilters {
  route_id?: number
  status?: string
}

export async function listOperatorStudents(filters: StudentFilters): Promise<OperatorStudent[]> {
  const { data } = await apiClient.get<OperatorStudent[]>('/api/operator/students', {
    params: filters,
  })
  return data
}
