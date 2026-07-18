import { apiClient } from './client'

export interface ParentRouteStop {
  id: number
  name: string
  sequence: number
}

export interface ParentRoute {
  id: number
  name: string
  zone: string | null
  school_destination: string | null
  base_monthly_fee: string | null
  stops: ParentRouteStop[]
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

export interface EnrollInput {
  full_name: string
  date_of_birth: string
  school_name: string
  route_id: number
  pickup_stop_id?: number | null
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

export async function enrollStudent(input: EnrollInput): Promise<Student> {
  const { data } = await apiClient.post<Student>('/api/parent/students', input)
  return data
}

export async function listMyInvoices(): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>('/api/parent/invoices')
  return data
}
