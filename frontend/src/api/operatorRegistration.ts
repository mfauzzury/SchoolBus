import { apiClient } from './client'
import { getCsrfCookie } from './auth'

export interface OperatorRegisterInput {
  company_name: string
  contact_person: string
  contact_phone: string
  email: string
  password: string
}

export async function registerOperator(input: OperatorRegisterInput): Promise<void> {
  await getCsrfCookie()
  await apiClient.post('/api/register-operator', input)
}
