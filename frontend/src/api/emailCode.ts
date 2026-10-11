import { apiClient } from './client'
import { getCsrfCookie } from './auth'

export interface EmailCodeSent {
  /** Seconds before another code may be asked for. */
  resend_after?: number
}

/**
 * Both calls take the endpoint that asks for the code (for example
 * `/api/register/10000/email-code`); the check lives at `<endpoint>/verify`.
 */
export async function sendEmailCode(endpoint: string, email: string): Promise<EmailCodeSent> {
  await getCsrfCookie()
  const { data } = await apiClient.post<EmailCodeSent>(endpoint, { email })
  return data
}

/**
 * Resolves to the proof token. The step that finally creates the account or
 * sets the password must send it back as `email_token`: the server only accepts
 * the verification from the browser that typed the code.
 */
export async function verifyEmailCode(endpoint: string, email: string, code: string): Promise<string> {
  await getCsrfCookie()
  const { data } = await apiClient.post<{ token: string }>(`${endpoint}/verify`, { email, code })
  return data.token
}
