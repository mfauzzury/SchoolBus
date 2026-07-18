import { apiClient } from './client'
import type { BankDetails, BusOperator } from './auth'

export interface ProfileInput {
  company_name: string
  contact_person: string
  contact_phone: string
  email: string
  bank_details?: BankDetails
}

export async function updateProfile(input: ProfileInput): Promise<BusOperator> {
  const { data } = await apiClient.put<BusOperator>('/api/operator/profile', input)
  return data
}

export async function uploadLogo(file: File): Promise<BusOperator> {
  const formData = new FormData()
  formData.append('logo', file)
  const { data } = await apiClient.post<BusOperator>('/api/operator/profile/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
