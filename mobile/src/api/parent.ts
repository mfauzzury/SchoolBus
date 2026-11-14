import { apiClient } from './client'

export interface ParentRouteContact {
  id: number
  full_name: string
  phone: string
}

export interface ParentRoute {
  id: number
  name: string
  zone: string | null
  school_destination: string | null
  bus: { id: number; plate_number: string } | null
  driver: ParentRouteContact | null
  conductor: ParentRouteContact | null
}

/** A transit center plan, with which bus (and driver) does each part of the day. */
export interface TransitPlanSummary {
  request_id: number
  transit_center: { id: number; name: string; phone: string | null } | null
  legs: string[]
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

export interface Student {
  id: number
  full_name: string
  school_name: string
  package_type: 'one_way' | 'return'
  enrollment_status: 'active' | 'suspended' | 'withdrawn'
  route: ParentRoute | null
  pickup_stop: { id: number; name: string; sequence: number } | null
  /** Going via a transit center, if any. */
  transit_plans?: TransitPlanSummary[]
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue'

export interface Invoice {
  id: number
  student_id: number
  billing_period: string
  period_start: string
  period_end: string
  final_amount: string
  status: InvoiceStatus
  due_date: string
  paid_at: string | null
  student: { id: number; full_name: string } | null
}

export async function listMyStudents(): Promise<Student[]> {
  const { data } = await apiClient.get<Student[]>('/api/parent/students')
  return data
}

export async function listMyInvoices(): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>('/api/parent/invoices')
  return data
}
