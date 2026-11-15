import { isAxiosError } from 'axios'

/**
 * What the server said went wrong with a request: the first validation error
 * if there are any, otherwise its general message. Undefined when the failure
 * wasn't an answer from the server (e.g. no connection).
 */
export function apiErrorMessage(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined
  const errors = error.response?.data?.errors as Record<string, string[]> | undefined
  return (errors ? Object.values(errors)[0]?.[0] : undefined) ?? error.response?.data?.message
}
