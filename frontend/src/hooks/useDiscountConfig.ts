import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDiscountConfig, updateDiscountConfig, type DiscountConfig } from '@/api/discountConfig'

export function useDiscountConfig() {
  return useQuery({ queryKey: ['discount-config'], queryFn: getDiscountConfig })
}

export function useUpdateDiscountConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DiscountConfig) => updateDiscountConfig(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discount-config'] }),
  })
}
