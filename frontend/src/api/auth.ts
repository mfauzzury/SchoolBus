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
  subscription_plan: string
  bank_details: BankDetails | null
  logo_path: string | null
  logo_url: string | null
}

export interface MeResponse {
  user: User
  tenant: BusOperator
  roles: string[]
}

export async function getCsrfCookie() {
  await apiClient.get('/sanctum/csrf-cookie')
}

export async function login(email: string, password: string): Promise<MeResponse> {
  await getCsrfCookie()
  await apiClient.post('/api/login', { email, password })
  return fetchMe()
}

export async function logout() {
  await apiClient.post('/api/logout')
}

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>('/api/me')
  return data
}
