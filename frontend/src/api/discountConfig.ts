import { apiClient } from './client'

export interface DiscountConfig {
  sibling_discounts: {
    '1': number
    '2': number
    '3': number
  }
}

export async function getDiscountConfig(): Promise<DiscountConfig> {
  const { data } = await apiClient.get<DiscountConfig>('/api/operator/discount-config')
  return data
}

export async function updateDiscountConfig(input: DiscountConfig): Promise<DiscountConfig> {
  const { data } = await apiClient.put<DiscountConfig>('/api/operator/discount-config', input)
  return data
}
