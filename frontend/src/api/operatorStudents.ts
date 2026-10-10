import { apiClient } from './client'

export interface OperatorStudentInvoice {
  id: number
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void'
  final_amount: string
  due_date: string
}

export interface OperatorStudent {
  id: number
  full_name: string
  date_of_birth: string
  school_name: string
  package_type: 'one_way' | 'return'
  enrollment_status: 'active' | 'suspended' | 'withdrawn'
  // The operator's custom monthly fee for this child; null means the route's price.
  fee_override: string | null
  parent_profile: { id: number; full_name: string; phone: string; email: string } | null
  route: {
    id: number
    name: string
    base_monthly_fee: string | null
    one_way_monthly_fee: string | null
  } | null
  pickup_stop: { id: number; name: string } | null
  invoices: OperatorStudentInvoice[]
}

export interface StudentParent {
  id: number
  full_name: string
  relationship: string | null
  ic_number: string
  phone: string
  email: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postcode: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_phone: string | null
}

/** The student's next automatic bill, or why there won't be one. */
export type NextBill =
  | {
      month: string
      amount: number
      amount_before_discount: number
      sibling_discount_rate: number
      due_date: string
    }
  | { reason: 'suspended' | 'withdrawn' | 'no_fee' | 'no_billed_months' }
  | { reason: 'ended'; ended_on: string }

/** One child as the operator's student page shows them. */
export interface OperatorStudentDetail {
  id: number
  full_name: string
  date_of_birth: string
  gender: 'male' | 'female' | null
  avatar_url: string | null
  school_name: string
  // Filled in by the parent.
  teacher_name: string | null
  class_name: string | null
  school_phone: string | null
  package_type: 'one_way' | 'return'
  enrollment_status: 'active' | 'suspended' | 'withdrawn'
  // The operator's custom monthly fee; null means the route's price.
  fee_override: string | null
  // First and last calendar month billed (null = no limit on that side).
  billing_starts_on: string | null
  billing_ends_on: string | null
  // What the daily billing will do next, worked out by the server.
  next_bill: NextBill
  created_at: string
  route: {
    id: number
    name: string
    zone: string | null
    school_destination: string | null
    base_monthly_fee: string | null
    one_way_monthly_fee: string | null
  } | null
  pickup_stop: { id: number; name: string } | null
  parent_profile: StudentParent
  siblings: {
    id: number
    full_name: string
    enrollment_status: 'active' | 'suspended' | 'withdrawn'
    route: { id: number; name: string } | null
  }[]
}

export interface StudentFilters {
  route_id?: number
  status?: string
}

export interface StudentBillingInput {
  fee_override?: number | null
  enrollment_status?: OperatorStudent['enrollment_status']
  // Whole months as "YYYY-MM"; null removes the limit.
  billing_starts_on?: string | null
  billing_ends_on?: string | null
}

export async function updateOperatorStudent(
  id: number,
  input: StudentBillingInput,
): Promise<OperatorStudent> {
  const { data } = await apiClient.put<OperatorStudent>(`/api/operator/students/${id}`, input)
  return data
}

export async function getOperatorStudent(id: number): Promise<OperatorStudentDetail> {
  const { data } = await apiClient.get<OperatorStudentDetail>(`/api/operator/students/${id}`)
  return data
}

export async function listOperatorStudents(filters: StudentFilters): Promise<OperatorStudent[]> {
  const { data } = await apiClient.get<OperatorStudent[]>('/api/operator/students', {
    params: filters,
  })
  return data
}
