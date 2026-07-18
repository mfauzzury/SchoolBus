import { apiClient } from './client'
import { getCsrfCookie } from './auth'

export interface TenantInfo {
  company_name: string
  logo_path: string | null
}

export interface RegisterInput {
  full_name: string
  ic_number: string
  phone: string
  email: string
  address?: string
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
