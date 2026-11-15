import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getBillingConfig, updateBillingConfig, type BillingConfig } from '@/api/billingConfig'

export function useBillingConfig() {
  return useQuery({ queryKey: ['billing-config'], queryFn: getBillingConfig })
}

export function useUpdateBillingConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BillingConfig) => updateBillingConfig(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['billing-config'] }),
  })
}
