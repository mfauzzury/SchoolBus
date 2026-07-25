import { apiClient } from './client'
import { getCsrfCookie } from './auth'

export interface ContactMessageInput {
  name: string
  email: string
  phone?: string
  message: string
}

export async function submitContactMessage(input: ContactMessageInput): Promise<void> {
  await getCsrfCookie()
  await apiClient.post('/api/contact', input)
}
