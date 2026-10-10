import { apiBaseUrl, apiClient } from './client'

export interface Payment {
  id: number
  receipt_number: string
  method: 'cash' | 'bank_transfer' | 'fpx' | 'online'
  reference_number: string | null
  payment_date: string
  amount_paid: string
}

export interface InvoiceItem {
  id: number
  type: 'fee' | 'discount' | 'adjustment'
  description: string
  // Signed: discounts and reductions are negative.
  amount: string
}

export interface LedgerInvoice {
  id: number
  student_id: number
  route_id: number | null
  package_type: string
  billing_period: string
  period_start: string
  period_end: string
  amount_before_discount: string
  discount_amount: string
  final_amount: string
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void'
  due_date: string
  issued_at: string | null
  paid_at: string | null
  voided_at: string | null
  void_reason: string | null
  amount_paid: string
  balance: string
  student: { id: number; full_name: string; parent_profile?: { id: number; full_name: string; phone: string } | null }
  route: { id: number; name: string } | null
  payments: Payment[]
  items: InvoiceItem[]
}

export interface Transaction extends Payment {
  invoice: {
    id: number
    period_start: string
    student: { id: number; full_name: string } | null
    route: { id: number; name: string } | null
  } | null
}

export interface TransactionFilters {
  route_id?: number
  search?: string
  method?: string
  date_from?: string
  date_to?: string
}

export interface OutstandingParent {
  parent: { id: number; full_name: string; phone: string; email: string }
  students: { id: number; full_name: string }[]
  invoice_count: number
  total_outstanding: number
  oldest_due_date: string | null
  days_overdue: number
}

export interface AdjustmentInput {
  description: string
  // Negative reduces the bill, positive adds a charge.
  amount: number
}

export interface CreateInvoiceInput {
  student_id: number
  year: number
  month: number
}

export interface DashboardSummary {
  total_expected: number
  total_collected: number
  total_outstanding: number
  overdue_count: number
}

export interface InvoiceFilters {
  route_id?: number
  student_id?: number
  parent_id?: number
  // Matches a child's or their parent's name.
  search?: string
  // Include cancelled bills (a billing history shows everything that happened).
  include_void?: boolean
  status?: string
  year?: number
  month?: number
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

export async function getInvoice(id: number): Promise<LedgerInvoice> {
  const { data } = await apiClient.get<LedgerInvoice>(`/api/operator/invoices/${id}`)
  return data
}

export async function createInvoice(input: CreateInvoiceInput): Promise<LedgerInvoice> {
  const { data } = await apiClient.post<LedgerInvoice>('/api/operator/invoices', input)
  return data
}

export async function addInvoiceAdjustment(
  invoiceId: number,
  input: AdjustmentInput,
): Promise<LedgerInvoice> {
  const { data } = await apiClient.post<LedgerInvoice>(
    `/api/operator/invoices/${invoiceId}/items`,
    input,
  )
  return data
}

export async function removeInvoiceAdjustment(
  invoiceId: number,
  itemId: number,
): Promise<LedgerInvoice> {
  const { data } = await apiClient.delete<LedgerInvoice>(
    `/api/operator/invoices/${invoiceId}/items/${itemId}`,
  )
  return data
}

export async function voidInvoice(invoiceId: number, reason: string): Promise<LedgerInvoice> {
  const { data } = await apiClient.post<LedgerInvoice>(`/api/operator/invoices/${invoiceId}/void`, {
    reason,
  })
  return data
}

export async function listTransactions(filters: TransactionFilters): Promise<Transaction[]> {
  const { data } = await apiClient.get<Transaction[]>('/api/operator/payments', { params: filters })
  return data
}

export async function listOutstanding(): Promise<OutstandingParent[]> {
  const { data } = await apiClient.get<OutstandingParent[]>('/api/operator/outstanding')
  return data
}

function exportUrl(path: string, filters: object): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const query = params.toString()
  return `${apiBaseUrl}${path}${query ? `?${query}` : ''}`
}

export function invoicesExportUrl(filters: InvoiceFilters): string {
  return exportUrl('/api/operator/invoices/export', filters)
}

export function transactionsExportUrl(filters: TransactionFilters): string {
  return exportUrl('/api/operator/payments/export', filters)
}

/** The receipt for one payment (a receipt is issued per payment, not per bill). */
export function receiptUrl(paymentId: number): string {
  return `${apiBaseUrl}/api/operator/payments/${paymentId}/receipt`
}
