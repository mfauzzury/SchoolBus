import { apiClient } from './client'

export interface User {
  id: number
  name: string
  email: string
  tenant_id: number | null
}

export interface BankDetails {
  bank_name?: string
  account_number?: string
  account_holder?: string
}

export interface BusOperator {
  id: number
  company_name: string
  operator_code: string
  contact_person: string
  contact_phone: string
  email: string
  /** 'suspended' locks everyone under this operator out until the platform team reactivates it. */
  status: 'active' | 'suspended'
  bank_details: BankDetails | null
  logo_path: string | null
  logo_url: string | null
  /** Optional company details, shown to parents on receipts and the operator card. */
  legal_name: string | null
  ssm_number: string | null
  address_line1: string | null
  address_line2: string | null
  postcode: string | null
  city: string | null
  state: string | null
  whatsapp_number: string | null
  payment_note: string | null
}

export interface ParentProfile {
  id: number
  full_name: string
  relationship: 'father' | 'mother' | 'guardian' | null
  gender: 'male' | 'female' | null
  avatar_url: string | null
  ic_number: string
  phone: string
  email: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postcode: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_phone: string | null
  /** The parent's own optional "About you" answers (never shown to operators). */
  income_range: string | null
  occupation: string | null
  working_field: string | null
  /** Null until they have saved the About form once; drives the "complete your profile" reminder. */
  about_saved_at: string | null
}

export interface MeResponse {
  user: User
  tenant: BusOperator | null
  parentProfile: ParentProfile | null
  roles: string[]
  /** Set while a platform-team member is logged in as this operator. */
  impersonating: { admin_name: string } | null
  /** Platform team only: what this level may change (empty for everyone else). */
  permissions: string[]
}

export async function getCsrfCookie() {
  await apiClient.get('/sanctum/csrf-cookie')
}

export async function login(
  email: string,
  password: string,
  remember: boolean,
): Promise<MeResponse> {
  await getCsrfCookie()
  await apiClient.post('/api/login', { email, password, remember })
  return fetchMe()
}

export async function logout() {
  await apiClient.post('/api/logout')
}

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>('/api/me')
  return data
}

export async function forgotPassword(email: string): Promise<void> {
  await getCsrfCookie()
  await apiClient.post('/api/forgot-password', { email })
}

export interface ResetPasswordInput {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await getCsrfCookie()
  await apiClient.post('/api/reset-password', input)
}
