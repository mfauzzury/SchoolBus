import { apiClient } from './client'

export interface BillingConfig {
  // Day of the month bills are due (1-28).
  due_day: number
  // Months of the year (1-12) that are billed; school-holiday months are left out.
  billed_months: number[]
  // 'auto': bills are made by themselves each morning. 'manual': the operator creates them from Next bills.
  mode: 'auto' | 'manual'
}

export type TransitLeg = 'school_to_center' | 'center_to_home' | 'home_to_center' | 'center_to_school'

/** A transit center's monthly add-on for each part of the day; null = not set yet. */
export type TransitPrices = Record<TransitLeg, number | null>

export const TRANSIT_LEGS: TransitLeg[] = ['school_to_center', 'center_to_home', 'home_to_center', 'center_to_school']

export async function getBillingConfig(): Promise<BillingConfig> {
  const { data } = await apiClient.get<BillingConfig>('/api/operator/billing-config')
  return data
}

export async function updateBillingConfig(input: Partial<BillingConfig>): Promise<BillingConfig> {
  const { data } = await apiClient.put<BillingConfig>('/api/operator/billing-config', input)
  return data
}
