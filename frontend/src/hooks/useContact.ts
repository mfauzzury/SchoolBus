import { useMutation } from '@tanstack/react-query'
import { submitContactMessage, type ContactMessageInput } from '@/api/contact'

export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: (input: ContactMessageInput) => submitContactMessage(input),
  })
}
