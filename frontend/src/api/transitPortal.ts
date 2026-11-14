import { apiClient } from './client'
import type { TransitPrices } from './billingConfig'

/** The logged-in transit center, as it sees itself. */
export interface MyTransitCenter {
  id: number
  name: string
  contact_person: string | null
  phone: string
  email: string
  address: string | null
  operator: { company_name: string; contact_phone: string | null; email: string | null }
  /** Indicative monthly price per leg, set by the bus operator. */
  transit_prices: TransitPrices
}

export async function getMyCenter(): Promise<MyTransitCenter> {
  const { data } = await apiClient.get<MyTransitCenter>('/api/transit/center')
  return data
}
