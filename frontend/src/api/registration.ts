import { apiClient } from './client'
import { getCsrfCookie } from './auth'

export interface TenantInfo {
  company_name: string
  logo_path: string | null
}

export interface RegisterInput {
  full_name: string
  relationship?: 'father' | 'mother' | 'guardian'
  gender?: 'male' | 'female'
  ic_number: string
  phone: string
  email: string
  /** Proof that this browser verified the email (see EmailCodeStep). */
  email_token?: string
  address_line1?: string
  address_line2?: string
  city?: string
  postcode?: string
  emergency_contact_name?: string
  emergency_contact_relationship?: string
  emergency_contact_phone?: string
  password: string
}

export async function fetchTenantByCode(operatorCode: string): Promise<TenantInfo> {
  const { data } = await apiClient.get<TenantInfo>(`/api/register/${operatorCode}`)
  return data
}

export async function registerParent(operatorCode: string, input: RegisterInput): Promise<void> {
  await getCsrfCookie()
  await apiClient.post(`/api/register/${operatorCode}`, input)
}
