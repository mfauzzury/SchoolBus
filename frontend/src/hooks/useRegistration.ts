import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTenantByCode, registerParent, type RegisterInput } from '@/api/registration'

export function useTenantByCode(operatorCode: string) {
  return useQuery({
    queryKey: ['tenant-by-code', operatorCode],
    queryFn: () => fetchTenantByCode(operatorCode),
    retry: false,
    enabled: operatorCode.length === 4,
  })
}

export function useRegisterParent(operatorCode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => registerParent(operatorCode, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}
