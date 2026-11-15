import { apiClient } from './client'

/** A transit center as its operator sees it: to look at only. */
export interface OperatorTransitCenter {
  id: number
  name: string
  contact_person: string | null
  phone: string
  address: string | null
  status: 'active' | 'inactive'
  /** What this center is charged per child each month; null = not set yet. */
  monthly_price: number | null
}

/** A transit center as the platform team manages it. */
export interface TransitCenter extends Omit<OperatorTransitCenter, 'monthly_price'> {
  operator: { id: number; company_name: string } | null
  email: string
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
  /** Only when adding: the operator the center belongs to (never changed after). */
  operator_id?: number
}

export async function listOperatorTransitCenters(): Promise<OperatorTransitCenter[]> {
  const { data } = await apiClient.get<OperatorTransitCenter[]>('/api/operator/transit-centers')
  return data
}

export async function getOperatorTransitCenter(id: number): Promise<OperatorTransitCenter> {
  const { data } = await apiClient.get<OperatorTransitCenter>(`/api/operator/transit-centers/${id}`)
  return data
}

/** Sets this center's monthly price; null clears it. */
export async function updateTransitCenterPrice(id: number, monthlyPrice: number | null): Promise<OperatorTransitCenter> {
  const { data } = await apiClient.put<OperatorTransitCenter>(`/api/operator/transit-centers/${id}/price`, {
    monthly_price: monthlyPrice,
  })
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
