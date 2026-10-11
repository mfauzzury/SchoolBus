import { apiBaseUrl, apiClient } from './client'
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
  avatar_url: string | null
}

export interface ParentRouteContact {
  id: number
  full_name: string
  phone: string
  avatar_url: string | null
}

export interface ParentRoute {
  id: number
  name: string
  zone: string | null
  school_destination: string | null
  base_monthly_fee: string | null
  one_way_monthly_fee: string | null
  stops: ParentRouteStop[]
  bus?: ParentRouteBus | null
  driver?: ParentRouteContact | null
  conductor?: ParentRouteContact | null
}

export interface Quote {
  sibling_discount_rate: number
  amount_before_discount: number
  discount_amount: number
  final_amount: number
}

export interface QuoteInput {
  route_id: number
  package_type: 'one_way' | 'return'
}

export interface InvoiceItem {
  id: number
  type: 'fee' | 'discount' | 'adjustment'
  description: string
  // Signed: discounts and reductions are negative.
  amount: string
}

export interface PaymentRecord {
  id: number
  receipt_number: string
  method: 'cash' | 'bank_transfer' | 'fpx' | 'online'
  reference_number: string | null
  payment_date: string
  amount_paid: string
}

export interface Invoice {
  id: number
  student_id: number
  package_type: 'one_way' | 'return'
  period_start: string
  period_end: string
  amount_before_discount: string
  discount_amount: string
  final_amount: string
  status: 'draft' | 'issued' | 'paid' | 'overdue'
  due_date: string
  issued_at: string | null
  paid_at: string | null
  // Only on the invoice list (GET /parent/invoices), not on invoices nested in a student.
  amount_paid?: string
  balance?: string
  items?: InvoiceItem[]
  payments?: PaymentRecord[]
  route?: { id: number; name: string } | null
}

export interface Student {
  id: number
  full_name: string
  date_of_birth: string
  gender: 'male' | 'female' | null
  avatar_url: string | null
  school_name: string
  teacher_name: string | null
  class_name: string | null
  school_phone: string | null
  route_id: number | null
  pickup_stop_id: number | null
  package_type: 'one_way' | 'return'
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
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at: string
}

export interface ApplyInput {
  full_name: string
  date_of_birth: string
  school_name: string
  package_type: 'one_way' | 'return'
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

export interface UpdateMyStudentInput {
  full_name: string
  date_of_birth: string
  gender: 'male' | 'female' | null
  teacher_name: string | null
  class_name: string | null
  school_phone: string | null
}

export async function updateMyStudent(id: number, input: UpdateMyStudentInput): Promise<Student> {
  const { data } = await apiClient.put<Student>(`/api/parent/students/${id}`, input)
  return data
}

export async function uploadMyStudentAvatar(id: number, file: File): Promise<Student> {
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await apiClient.post<Student>(`/api/parent/students/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
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

export interface PaymentAttempt {
  id: number
  status: 'pending' | 'paid'
  amount: string
  paid_at: string | null
  /** Billplz page to retry on; only present while the attempt is still unpaid. */
  bill_url: string | null
  /** One per invoice paid; empty until the attempt is paid. */
  receipts: PaymentReceipt[]
}

export interface PaymentReceipt {
  payment_id: number
  receipt_number: string
  amount: string
  student_name: string
}

export async function getPaymentConfig(): Promise<{ enabled: boolean }> {
  const { data } = await apiClient.get<{ enabled: boolean }>('/api/parent/payments/config')
  return data
}

export async function startPayment(invoiceIds: number[]): Promise<{ id: number; url: string }> {
  const { data } = await apiClient.post<{ id: number; url: string }>('/api/parent/payments', {
    invoice_ids: invoiceIds,
  })
  return data
}

export async function getPaymentAttempt(id: number): Promise<PaymentAttempt> {
  const { data } = await apiClient.get<PaymentAttempt>(`/api/parent/payments/${id}`)
  return data
}

export interface BillplzRedirectParams {
  id: string
  paid: string
  paid_at?: string
  x_signature: string
}

export async function confirmPayment(
  id: number,
  billplz: BillplzRedirectParams,
): Promise<PaymentAttempt> {
  const { data } = await apiClient.post<PaymentAttempt>(`/api/parent/payments/${id}/confirm`, {
    billplz,
  })
  return data
}

/** The receipt for one payment (a receipt is issued per payment, not per bill). */
export function receiptUrl(paymentId: number): string {
  return `${apiBaseUrl}/api/parent/payments/${paymentId}/receipt`
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

export interface UpdateParentAboutInput {
  income_range: string | null
  occupation: string | null
  working_field: string | null
}

export async function updateParentAbout(input: UpdateParentAboutInput): Promise<ParentProfile> {
  const { data } = await apiClient.put<ParentProfile>('/api/parent/profile/about', input)
  return data
}

export async function uploadParentAvatar(file: File): Promise<ParentProfile> {
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await apiClient.post<ParentProfile>('/api/parent/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export interface UpdatePasswordInput {
  current_password: string
  password: string
  password_confirmation: string
}

export async function updateParentPassword(input: UpdatePasswordInput): Promise<void> {
  await apiClient.put('/api/parent/profile/password', input)
}
