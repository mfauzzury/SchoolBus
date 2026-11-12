import { apiClient } from './client'

export interface NextBillRow {
  student_id: number
  student_name: string
  parent_name: string | null
  route_id: number | null
  route_name: string | null
  package_type: 'one_way' | 'return'
  // What the bill will be after the sibling discount.
  amount: number
  amount_before_discount: number
  sibling_discount_rate: number
  is_custom_fee: boolean
  due_date: string
}

export interface NextBillProblem {
  student_id: number
  student_name: string
  reason: 'no_route' | 'no_fee'
}

export interface NextBills {
  // First day of the month these bills are for (YYYY-MM-DD).
  month: string
  // False when this is next month, shown ahead of time.
  is_current_month: boolean
  rows: NextBillRow[]
  problems: NextBillProblem[]
  total: number
  already_billed: number
  mode: 'auto' | 'manual'
  last_run: { at: string; source: 'auto' | 'manual'; generated: number; skipped: number } | null
}

export interface NextBillsSummary {
  mode: 'auto' | 'manual'
  // Bills for this month that are waiting for the operator to create them.
  waiting: number
  month: string | null
}

export interface CreateNextBillsResult {
  created: number
  failed: number
  month: string
}

export async function getNextBills(): Promise<NextBills> {
  const { data } = await apiClient.get<NextBills>('/api/operator/next-bills')
  return data
}

export async function getNextBillsSummary(): Promise<NextBillsSummary> {
  const { data } = await apiClient.get<NextBillsSummary>('/api/operator/next-bills/summary')
  return data
}

export async function createNextBills(input: { month: string; student_ids: number[] }): Promise<CreateNextBillsResult> {
  const { data } = await apiClient.post<CreateNextBillsResult>('/api/operator/next-bills', input)
  return data
}
