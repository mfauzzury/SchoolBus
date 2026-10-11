import { apiClient } from './client'
import { getCsrfCookie } from './auth'

export interface OperatorRegisterInput {
  company_name: string
  contact_person: string
  contact_phone: string
  email: string
  /** Proof that this browser verified the email (see EmailCodeStep). */
  email_token?: string
  password: string
}

export async function registerOperator(input: OperatorRegisterInput): Promise<void> {
  await getCsrfCookie()
  await apiClient.post('/api/register-operator', input)
}
