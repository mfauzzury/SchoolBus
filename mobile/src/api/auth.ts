import { apiClient } from './client'
import { APP_VARIANT } from '../lib/variant'

export interface DriverLoginInput {
  operator_code: string
  phone: string
  pin: string
  device_name?: string
}

export interface StaffRecord {
  id: number
  full_name: string
  phone: string
  role: string
}

export interface DriverLoginResponse {
  token: string
  user: { id: number; name: string; email: string; tenant_id: number }
  staff: StaffRecord
}

export interface ParentLoginInput {
  email: string
  password: string
  device_name?: string
}

export interface ParentLoginResponse {
  token: string
  user: { id: number; name: string; email: string; tenant_id: number }
}

export interface MeResponse {
  user: { id: number; name: string; email: string; tenant_id: number }
  tenant: {
    id: number
    company_name: string
    operator_code: string
    contact_phone: string | null
    email: string | null
  } | null
  parentProfile: { id: number; full_name: string; phone: string; email: string; avatar_url: string | null } | null
  roles: string[]
}

export async function driverLogin(input: DriverLoginInput): Promise<DriverLoginResponse> {
  const { data } = await apiClient.post<DriverLoginResponse>('/api/driver/login', input)
  return data
}

export async function parentLogin(input: ParentLoginInput): Promise<ParentLoginResponse> {
  const { data } = await apiClient.post<ParentLoginResponse>('/api/parent/login', input)
  return data
}

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>('/api/me')
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post(`/api/${APP_VARIANT}/logout`)
}
