import { apiClient } from './client'

export interface BillingConfig {
  // Day of the month bills are due (1-28).
  due_day: number
  // Months of the year (1-12) that are billed; school-holiday months are left out.
  billed_months: number[]
}

export async function getBillingConfig(): Promise<BillingConfig> {
  const { data } = await apiClient.get<BillingConfig>('/api/operator/billing-config')
  return data
}

export async function updateBillingConfig(input: BillingConfig): Promise<BillingConfig> {
  const { data } = await apiClient.put<BillingConfig>('/api/operator/billing-config', input)
  return data
}
