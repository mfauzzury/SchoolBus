import { apiClient } from './client'

export interface MonthFigures {
  new_operators: number
  new_students: number
  /** Money received (payments by payment date), in ringgit. */
  collected: number
}

export interface PlatformSummary {
  /** This month so far, and the whole of last month. */
  this_month: MonthFigures
  last_month: MonthFigures
  total_operators: number
  total_students: number
  total_buses: number
  total_parents: number
  total_expected: number
  total_collected: number
  total_outstanding: number
}

export interface PlanSummary {
  id: number
  name: string
  code: string
  /** null = unlimited */
  student_limit: number | null
}

export interface AdminOperator {
  id: number
  company_name: string
  operator_code: string
  contact_person: string
  contact_phone: string
  email: string
  plan: PlanSummary | null
  status: 'active' | 'suspended'
  created_at: string
  last_login_at: string | null
  billplz_enabled: boolean
  students_count: number
  /** Students currently enrolled and active — what a plan's limit is measured against. */
  active_students_count: number
  buses_count: number
  staff_count: number
  routes_count: number
  parents_count: number
}

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const { data } = await apiClient.get<PlatformSummary>('/api/admin/dashboard/summary')
  return data
}

export type AttentionKind = 'new' | 'no_billplz' | 'no_students' | 'over_limit' | 'inactive'

export interface OperatorFilters {
  page?: number
  attention?: AttentionKind
  search?: string
  status?: 'active' | 'suspended'
  billplz?: 'connected' | 'none'
  plan_id?: number
  over_limit?: boolean
  sort?: 'company_name' | 'created_at' | 'students_count' | 'last_login_at'
  direction?: 'asc' | 'desc'
}

export async function listOperators(filters: OperatorFilters): Promise<Paginated<AdminOperator>> {
  const { data } = await apiClient.get<Paginated<AdminOperator>>('/api/admin/operators', {
    // Laravel's `boolean` rule accepts 1/0, not the string "true".
    params: { ...filters, over_limit: filters.over_limit ? 1 : undefined },
  })
  return data
}

export interface OperatorOption {
  id: number
  company_name: string
}

export async function listOperatorOptions(): Promise<OperatorOption[]> {
  const { data } = await apiClient.get<OperatorOption[]>('/api/admin/operators/options')
  return data
}

export interface AdminOperatorBus {
  id: number
  plate_number: string
  capacity: number
  status: 'active' | 'maintenance' | 'retired'
  avatar_url: string | null
}

export interface AdminOperatorStaff {
  id: number
  full_name: string
  role: 'driver' | 'conductor'
  phone: string
  status: 'active' | 'inactive'
  license_expiry_date: string | null
  avatar_url: string | null
}

export interface AdminOperatorRoute {
  id: number
  name: string
  zone: string | null
  school_destination: string | null
  base_monthly_fee: string | null
  stops_count: number
  bus: { id: number; plate_number: string } | null
  driver: { id: number; full_name: string } | null
  conductor: { id: number; full_name: string } | null
}

export interface AdminOperatorStudent {
  id: number
  full_name: string
  package_type: string
  enrollment_status: 'active' | 'suspended' | 'withdrawn'
  parent_profile: { id: number; full_name: string; phone: string; email: string } | null
  route: { id: number; name: string } | null
}

export interface BillplzSettings {
  enabled: boolean
  sandbox: boolean
  collection_id: string | null
  has_secret_key: boolean
  has_x_signature_key: boolean
}

export interface BillplzSettingsInput {
  /** Omit/blank to keep the stored key — keys are never sent back to the browser. */
  secret_key?: string
  x_signature_key?: string
  collection_id: string
  sandbox: boolean
}

export interface AdminOperatorDetail extends AdminOperator {
  suspended_at: string | null
  suspended_reason: string | null
  logo_url: string | null
  billplz: BillplzSettings
  buses: AdminOperatorBus[]
  staff: AdminOperatorStaff[]
  routes: AdminOperatorRoute[]
  students: AdminOperatorStudent[]
  finance_summary: {
    total_expected: number
    total_collected: number
    total_outstanding: number
    overdue_count: number
  }
}

export async function getOperator(id: number): Promise<AdminOperatorDetail> {
  const { data } = await apiClient.get<AdminOperatorDetail>(`/api/admin/operators/${id}`)
  return data
}

export async function updateBillplzSettings(
  id: number,
  input: BillplzSettingsInput,
): Promise<BillplzSettings> {
  const { data } = await apiClient.put<BillplzSettings>(`/api/admin/operators/${id}/billplz`, input)
  return data
}

export interface BillplzConnectionResult {
  ok: boolean
  reason: 'ok' | 'unauthorized' | 'collection_not_found' | 'unreachable'
  collection_title: string | null
  warnings: 'x_signature_same_as_secret'[]
}

export async function testBillplzConnection(id: number): Promise<BillplzConnectionResult> {
  const { data } = await apiClient.post<BillplzConnectionResult>(
    `/api/admin/operators/${id}/billplz/test`,
  )
  return data
}

export async function disableBillplz(id: number): Promise<BillplzSettings> {
  const { data } = await apiClient.delete<BillplzSettings>(`/api/admin/operators/${id}/billplz`)
  return data
}

export interface Transaction {
  id: number
  method: 'cash' | 'bank_transfer' | 'fpx' | 'online'
  reference_number: string | null
  payment_date: string
  amount_paid: string
  invoice: {
    id: number
    student: { id: number; full_name: string }
    route: { id: number; name: string } | null
  }
  bus_operator: {
    id: number
    company_name: string
    operator_code: string
  }
}

export interface TransactionFilters {
  page?: number
  operator_id?: number
  method?: string
  date_from?: string
  date_to?: string
}

export interface TransactionPage extends Paginated<Transaction> {
  /** Cover everything the filters match, not just this page. */
  totals: { count: number; amount: number }
}

export async function listTransactions(filters: TransactionFilters): Promise<TransactionPage> {
  const { data } = await apiClient.get<TransactionPage>('/api/admin/transactions', {
    params: filters,
  })
  return data
}

/** Downloads the filtered transactions as a CSV file in the browser. */
export async function downloadTransactions(filters: Omit<TransactionFilters, 'page'>): Promise<void> {
  const { data } = await apiClient.get<Blob>('/api/admin/transactions/export', {
    params: filters,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = 'transactions.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export interface PaymentAttempt {
  id: number
  amount: string
  status: 'pending' | 'paid'
  /** Pending for over an hour: probably an unfinished or failed checkout. */
  stuck: boolean
  created_at: string
  paid_at: string | null
  invoices_count: number
  bus_operator: { id: number; company_name: string; operator_code: string } | null
  user: { id: number; name: string } | null
}

export interface PaymentAttemptFilters {
  page?: number
  operator_id?: number
  status?: 'pending' | 'paid'
  stuck?: boolean
}

export async function listPaymentAttempts(
  filters: PaymentAttemptFilters,
): Promise<Paginated<PaymentAttempt>> {
  const { data } = await apiClient.get<Paginated<PaymentAttempt>>('/api/admin/payment-attempts', {
    params: { ...filters, stuck: filters.stuck ? 1 : undefined },
  })
  return data
}

export interface TrendMonth extends MonthFigures {
  /** 'YYYY-MM' */
  month: string
}

export async function getTrends(): Promise<TrendMonth[]> {
  const { data } = await apiClient.get<{ months: TrendMonth[] }>('/api/admin/dashboard/trends')
  return data.months
}

export interface AttentionList<TItem> {
  count: number
  items: TItem[]
}

export interface AttentionOperator {
  id: number
  company_name: string
}

export interface AttentionStuckPayment {
  id: number
  amount: string
  created_at: string
  operator_id: number
  company_name: string | null
}

export type PlatformAttention = Record<AttentionKind, AttentionList<AttentionOperator>> & {
  stuck_payments: AttentionList<AttentionStuckPayment>
}

export async function getAttention(): Promise<PlatformAttention> {
  const { data } = await apiClient.get<PlatformAttention>('/api/admin/dashboard/attention')
  return data
}

export interface TeamMember {
  id: number
  name: string
  email: string
  level: 'owner' | 'finance' | 'support' | null
  last_login_at: string | null
  deactivated_at: string | null
  created_at: string
}

export interface TeamMemberInput {
  name: string
  email: string
  level: 'owner' | 'finance' | 'support'
}

export async function listTeam(): Promise<TeamMember[]> {
  const { data } = await apiClient.get<TeamMember[]>('/api/admin/team')
  return data
}

export async function addTeamMember(input: TeamMemberInput): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>('/api/admin/team', input)
  return data
}

export async function changeTeamLevel(id: number, level: TeamMemberInput['level']): Promise<TeamMember> {
  const { data } = await apiClient.put<TeamMember>(`/api/admin/team/${id}`, { level })
  return data
}

export async function deactivateTeamMember(id: number): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>(`/api/admin/team/${id}/deactivate`)
  return data
}

export async function reactivateTeamMember(id: number): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>(`/api/admin/team/${id}/reactivate`)
  return data
}

export interface ActivityEntry {
  id: number
  action: string
  properties: Record<string, string | number | boolean | null> | null
  ip_address: string | null
  created_at: string
  user: { id: number; name: string } | null
  bus_operator: { id: number; company_name: string } | null
}

export interface ActivityFilters {
  page?: number
  user_id?: number
  tenant_id?: number
  action?: string
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

export async function listActivity(filters: ActivityFilters): Promise<Paginated<ActivityEntry>> {
  const { data } = await apiClient.get<Paginated<ActivityEntry>>('/api/admin/activity', {
    params: filters,
  })
  return data
}

export async function listActivityActions(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/api/admin/activity/actions')
  return data
}

export interface OperatorDetailsInput {
  company_name: string
  contact_person: string
  contact_phone: string
}

export async function updateOperator(id: number, input: OperatorDetailsInput) {
  const { data } = await apiClient.put(`/api/admin/operators/${id}`, input)
  return data
}

export async function suspendOperator(id: number, reason: string) {
  const { data } = await apiClient.post(`/api/admin/operators/${id}/suspend`, { reason })
  return data
}

export async function reactivateOperator(id: number) {
  const { data } = await apiClient.post(`/api/admin/operators/${id}/reactivate`)
  return data
}

export async function sendOperatorPasswordReset(id: number): Promise<{ email: string }> {
  const { data } = await apiClient.post<{ email: string }>(`/api/admin/operators/${id}/password-reset`)
  return data
}

export interface OperatorNote {
  id: number
  body: string
  user_id: number | null
  created_at: string
  user: { id: number; name: string } | null
}

export async function listOperatorNotes(id: number): Promise<OperatorNote[]> {
  const { data } = await apiClient.get<OperatorNote[]>(`/api/admin/operators/${id}/notes`)
  return data
}

export async function addOperatorNote(id: number, body: string): Promise<OperatorNote> {
  const { data } = await apiClient.post<OperatorNote>(`/api/admin/operators/${id}/notes`, { body })
  return data
}

export async function deleteOperatorNote(id: number, noteId: number): Promise<void> {
  await apiClient.delete(`/api/admin/operators/${id}/notes/${noteId}`)
}

export async function startImpersonation(id: number): Promise<void> {
  await apiClient.post(`/api/admin/operators/${id}/impersonate`)
}

export async function stopImpersonation(): Promise<{ operator_id?: number }> {
  const { data } = await apiClient.post<{ operator_id?: number }>('/api/impersonation/stop')
  return data
}

export interface Plan extends PlanSummary {
  monthly_price: string
  price_per_student: string
  is_default: boolean
  is_active: boolean
  sort_order: number
  operators_count: number
}

export interface PlanInput {
  name: string
  code: string
  student_limit: number | null
  monthly_price: number
  price_per_student: number
  is_default: boolean
  is_active: boolean
  sort_order: number
}

export async function listPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>('/api/admin/plans')
  return data
}

export async function createPlan(input: PlanInput): Promise<Plan> {
  const { data } = await apiClient.post<Plan>('/api/admin/plans', input)
  return data
}

export async function updatePlan(id: number, input: PlanInput): Promise<Plan> {
  const { data } = await apiClient.put<Plan>(`/api/admin/plans/${id}`, input)
  return data
}

export async function deletePlan(id: number): Promise<void> {
  await apiClient.delete(`/api/admin/plans/${id}`)
}

export async function assignOperatorPlan(operatorId: number, planId: number): Promise<PlanSummary> {
  const { data } = await apiClient.put<PlanSummary>(`/api/admin/operators/${operatorId}/plan`, {
    plan_id: planId,
  })
  return data
}

export interface ContactMessage {
  id: number
  name: string
  email: string
  phone: string | null
  message: string
  created_at: string
  handled_at: string | null
  handler: { id: number; name: string } | null
}

export async function listInbox(filters: {
  page?: number
  status?: 'open' | 'handled'
}): Promise<Paginated<ContactMessage>> {
  const { data } = await apiClient.get<Paginated<ContactMessage>>('/api/admin/inbox', {
    params: filters,
  })
  return data
}

export async function getInboxSummary(): Promise<{ open: number }> {
  const { data } = await apiClient.get<{ open: number }>('/api/admin/inbox/summary')
  return data
}

export async function getInboxMessage(id: number): Promise<ContactMessage> {
  const { data } = await apiClient.get<ContactMessage>(`/api/admin/inbox/${id}`)
  return data
}

export async function handleInboxMessage(id: number): Promise<ContactMessage> {
  const { data } = await apiClient.post<ContactMessage>(`/api/admin/inbox/${id}/handle`)
  return data
}

export async function reopenInboxMessage(id: number): Promise<ContactMessage> {
  const { data } = await apiClient.post<ContactMessage>(`/api/admin/inbox/${id}/reopen`)
  return data
}

export interface Announcement {
  id: number
  title: string
  body: string
  title_ms: string | null
  body_ms: string | null
  starts_at: string | null
  ends_at: string | null
  status: 'scheduled' | 'live' | 'ended'
  created_at: string
}

export interface AnnouncementInput {
  title: string
  body: string
  title_ms: string | null
  body_ms: string | null
  starts_at: string | null
  ends_at: string | null
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data } = await apiClient.get<Announcement[]>('/api/admin/announcements')
  return data
}

export async function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  const { data } = await apiClient.post<Announcement>('/api/admin/announcements', input)
  return data
}

export async function updateAnnouncement(id: number, input: AnnouncementInput): Promise<Announcement> {
  const { data } = await apiClient.put<Announcement>(`/api/admin/announcements/${id}`, input)
  return data
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await apiClient.delete(`/api/admin/announcements/${id}`)
}

export interface SystemHealth {
  billing: {
    ran_at: string | null
    /** null = it has never run */
    ok: boolean | null
    generated: number | null
    skipped: number | null
    message: string | null
    stale: boolean
  }
  failed_jobs: { count: number; latest: { id: number; name: string; failed_at: string }[] }
  billplz_webhook: { received_at: string | null }
  sandbox_operators: { count: number; items: { id: number; company_name: string }[] }
  environment: { app_env: string; debug: boolean; mailer: string; queue: string }
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const { data } = await apiClient.get<SystemHealth>('/api/admin/system')
  return data
}
