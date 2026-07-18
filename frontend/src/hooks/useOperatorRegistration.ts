import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerOperator, type OperatorRegisterInput } from '@/api/operatorRegistration'

export function useRegisterOperator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OperatorRegisterInput) => registerOperator(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}
