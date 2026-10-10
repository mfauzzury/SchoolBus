import { apiClient } from './client'

export interface PlatformSummary {
  total_operators: number
  total_students: number
  total_buses: number
  total_parents: number
  total_expected: number
  total_collected: number
  total_outstanding: number
}

export interface AdminOperator {
  id: number
  company_name: string
  operator_code: string
  contact_person: string
  contact_phone: string
  email: string
  subscription_plan: string
  status: 'active' | 'suspended'
  created_at: string
  last_login_at: string | null
  billplz_enabled: boolean
  students_count: number
  buses_count: number
  staff_count: number
  routes_count: number
  parents_count: number
}

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const { data } = await apiClient.get<PlatformSummary>('/api/admin/dashboard/summary')
  return data
}

export interface OperatorFilters {
  page?: number
  search?: string
  status?: 'active' | 'suspended'
  billplz?: 'connected' | 'none'
  sort?: 'company_name' | 'created_at' | 'students_count' | 'last_login_at'
  direction?: 'asc' | 'desc'
}

export async function listOperators(filters: OperatorFilters): Promise<Paginated<AdminOperator>> {
  const { data } = await apiClient.get<Paginated<AdminOperator>>('/api/admin/operators', {
    params: filters,
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
  operator_id?: number
  method?: string
  date_from?: string
  date_to?: string
}

export async function listTransactions(filters: TransactionFilters): Promise<Transaction[]> {
  const { data } = await apiClient.get<Transaction[]>('/api/admin/transactions', {
    params: filters,
  })
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
