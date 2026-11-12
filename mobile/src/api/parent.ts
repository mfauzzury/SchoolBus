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

export interface Student {
  id: number
  full_name: string
  school_name: string
  package_type: 'one_way' | 'return'
  enrollment_status: 'active' | 'suspended' | 'withdrawn'
  route: ParentRoute | null
  pickup_stop: { id: number; name: string; sequence: number } | null
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
