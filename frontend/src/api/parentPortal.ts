import { apiClient } from './client'
import type { ParentProfile } from './auth'

export interface ParentRouteStop {
  id: number
  name: string
  sequence: number
}

export interface ParentRouteBus {
  id: number
  plate_number: string
  capacity: number
}

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
  base_monthly_fee: string | null
  stops: ParentRouteStop[]
  bus?: ParentRouteBus | null
  driver?: ParentRouteContact | null
  conductor?: ParentRouteContact | null
}

export interface Quote {
  months: number
  billing_discount_rate: number
  sibling_discount_rate: number
  amount_before_discount: number
  discount_amount: number
  final_amount: number
}

export interface QuoteInput {
  route_id: number
  billing_period: 'monthly' | 'quarterly' | 'half_year' | 'yearly'
}

export interface Invoice {
  id: number
  student_id: number
  package_type: 'one_way' | 'return'
  billing_period: string
  period_start: string
  period_end: string
  amount_before_discount: string
  discount_amount: string
  final_amount: string
  status: 'draft' | 'issued' | 'paid' | 'overdue'
  due_date: string
  issued_at: string | null
  paid_at: string | null
}

export interface Student {
  id: number
  full_name: string
  date_of_birth: string
  school_name: string
  route_id: number | null
  pickup_stop_id: number | null
  package_type: 'one_way' | 'return'
  billing_period: string
  enrollment_status: 'active' | 'suspended' | 'withdrawn'
  route: ParentRoute | null
  pickup_stop: ParentRouteStop | null
  invoices: Invoice[]
}

export interface MyStudentApplication {
  id: number
  full_name: string
  date_of_birth: string
  school_name: string
  package_type: 'one_way' | 'return'
  billing_period: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at: string
}

export interface ApplyInput {
  full_name: string
  date_of_birth: string
  school_name: string
  package_type: 'one_way' | 'return'
  billing_period: 'monthly' | 'quarterly' | 'half_year' | 'yearly'
}

export async function listParentRoutes(): Promise<ParentRoute[]> {
  const { data } = await apiClient.get<ParentRoute[]>('/api/parent/routes')
  return data
}

export async function getQuote(input: QuoteInput): Promise<Quote> {
  const { data } = await apiClient.post<Quote>('/api/parent/quote', input)
  return data
}

export async function listMyStudents(): Promise<Student[]> {
  const { data } = await apiClient.get<Student[]>('/api/parent/students')
  return data
}

export async function listMyStudentApplications(): Promise<MyStudentApplication[]> {
  const { data } = await apiClient.get<MyStudentApplication[]>('/api/parent/student-applications')
  return data
}

export async function submitStudentApplication(input: ApplyInput): Promise<MyStudentApplication> {
  const { data } = await apiClient.post<MyStudentApplication>('/api/parent/student-applications', input)
  return data
}

export async function listMyInvoices(): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>('/api/parent/invoices')
  return data
}

export function receiptUrl(invoiceId: number): string {
  return `${import.meta.env.VITE_API_URL}/api/parent/invoices/${invoiceId}/receipt`
}

export interface UpdateParentProfileInput {
  full_name: string
  relationship?: 'father' | 'mother' | 'guardian' | null
  gender?: 'male' | 'female' | null
  ic_number: string
  phone: string
  email: string
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  postcode?: string | null
  emergency_contact_name?: string | null
  emergency_contact_relationship?: string | null
  emergency_contact_phone?: string | null
}

export async function updateParentProfile(input: UpdateParentProfileInput): Promise<ParentProfile> {
  const { data } = await apiClient.put<ParentProfile>('/api/parent/profile', input)
  return data
}
