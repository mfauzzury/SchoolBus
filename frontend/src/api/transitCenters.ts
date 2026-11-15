import { apiClient } from './client'

/** A transit center as its operator sees it: to look at only. */
export interface OperatorTransitCenter {
  id: number
  name: string
  contact_person: string | null
  phone: string
  address: string | null
  status: 'active' | 'inactive'
  has_login: boolean
}

/** A transit center as the platform team manages it. */
export interface TransitCenter extends OperatorTransitCenter {
  operator: { id: number; company_name: string } | null
  email: string
  /** True once a login has been sent; the center sets its own password from the email. */
  last_login_at: string | null
}

export interface TransitCenterInput {
  name: string
  contact_person: string | null
  phone: string
  email: string
  address: string | null
  status?: 'active' | 'inactive'
  /** Only when adding: the operator the center belongs to (never changed after). */
  operator_id?: number
}

export async function listOperatorTransitCenters(): Promise<OperatorTransitCenter[]> {
  const { data } = await apiClient.get<OperatorTransitCenter[]>('/api/operator/transit-centers')
  return data
}

export async function listTransitCenters(operatorId?: number): Promise<TransitCenter[]> {
  const { data } = await apiClient.get<TransitCenter[]>('/api/admin/transit-centers', {
    params: operatorId ? { operator_id: operatorId } : undefined,
  })
  return data
}

export async function getTransitCenter(id: number): Promise<TransitCenter> {
  const { data } = await apiClient.get<TransitCenter>(`/api/admin/transit-centers/${id}`)
  return data
}

export async function createTransitCenter(input: TransitCenterInput): Promise<TransitCenter> {
  const { data } = await apiClient.post<TransitCenter>('/api/admin/transit-centers', input)
  return data
}

export async function updateTransitCenter(id: number, input: TransitCenterInput): Promise<TransitCenter> {
  const { data } = await apiClient.put<TransitCenter>(`/api/admin/transit-centers/${id}`, input)
  return data
}

export async function sendTransitCenterLogin(id: number): Promise<TransitCenter> {
  const { data } = await apiClient.post<TransitCenter>(`/api/admin/transit-centers/${id}/login`)
  return data
}
