import { apiClient } from './client'

export interface Payment {
  id: number
  method: 'cash' | 'bank_transfer' | 'fpx' | 'online'
  reference_number: string | null
  payment_date: string
  amount_paid: string
}

export interface LedgerInvoice {
  id: number
  student_id: number
  route_id: number | null
  package_type: string
  billing_period: string
  amount_before_discount: string
  discount_amount: string
  final_amount: string
  status: 'draft' | 'issued' | 'paid' | 'overdue'
  due_date: string
  issued_at: string | null
  paid_at: string | null
  student: { id: number; full_name: string }
  route: { id: number; name: string } | null
  payments: Payment[]
}

export interface DashboardSummary {
  total_expected: number
  total_collected: number
  total_outstanding: number
  overdue_count: number
}

export interface InvoiceFilters {
  route_id?: number
  status?: string
  month?: string
  date_from?: string
  date_to?: string
}

export interface RecordPaymentInput {
  method: 'cash' | 'bank_transfer' | 'fpx' | 'online'
  reference_number?: string
  payment_date: string
  amount_paid: number
}

export async function listInvoices(filters: InvoiceFilters): Promise<LedgerInvoice[]> {
  const { data } = await apiClient.get<LedgerInvoice[]>('/api/operator/invoices', {
    params: filters,
  })
  return data
}

export async function getDashboardSummary(
  filters: Omit<InvoiceFilters, 'status'>,
): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/api/operator/dashboard/summary', {
    params: filters,
  })
  return data
}

export async function recordPayment(
  invoiceId: number,
  input: RecordPaymentInput,
): Promise<LedgerInvoice> {
  const { data } = await apiClient.post<LedgerInvoice>(
    `/api/operator/invoices/${invoiceId}/payments`,
    input,
  )
  return data
}

export function invoicesExportUrl(filters: InvoiceFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const query = params.toString()
  return `${import.meta.env.VITE_API_URL}/api/operator/invoices/export${query ? `?${query}` : ''}`
}
