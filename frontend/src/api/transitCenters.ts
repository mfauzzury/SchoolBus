import { apiClient } from './client'

export interface TransitCenter {
  id: number
  name: string
  contact_person: string | null
  phone: string
  email: string
  address: string | null
  status: 'active' | 'inactive'
  /** True once a login has been sent; the center sets its own password from the email. */
  has_login: boolean
  last_login_at: string | null
}

export interface TransitCenterInput {
  name: string
  contact_person: string | null
  phone: string
  email: string
  address: string | null
  status?: 'active' | 'inactive'
}

export async function listTransitCenters(): Promise<TransitCenter[]> {
  const { data } = await apiClient.get<TransitCenter[]>('/api/operator/transit-centers')
  return data
}

export async function getTransitCenter(id: number): Promise<TransitCenter> {
  const { data } = await apiClient.get<TransitCenter>(`/api/operator/transit-centers/${id}`)
  return data
}

export async function createTransitCenter(input: TransitCenterInput): Promise<TransitCenter> {
  const { data } = await apiClient.post<TransitCenter>('/api/operator/transit-centers', input)
  return data
}

export async function updateTransitCenter(id: number, input: TransitCenterInput): Promise<TransitCenter> {
  const { data } = await apiClient.put<TransitCenter>(`/api/operator/transit-centers/${id}`, input)
  return data
}

export async function sendTransitCenterLogin(id: number): Promise<TransitCenter> {
  const { data } = await apiClient.post<TransitCenter>(`/api/operator/transit-centers/${id}/login`)
  return data
}
