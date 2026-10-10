import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  disableBillplz,
  getOperator,
  getPlatformSummary,
  listOperators,
  listTransactions,
  testBillplzConnection,
  updateBillplzSettings,
  type BillplzSettingsInput,
  type TransactionFilters,
} from '@/api/admin'

export function usePlatformSummary() {
  return useQuery({ queryKey: ['admin-dashboard-summary'], queryFn: getPlatformSummary })
}

export function useAdminOperators() {
  return useQuery({ queryKey: ['admin-operators'], queryFn: listOperators })
}

export function useAdminOperator(id: number) {
  return useQuery({ queryKey: ['admin-operator', id], queryFn: () => getOperator(id) })
}

export function useAdminTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['admin-transactions', filters],
    queryFn: () => listTransactions(filters),
  })
}

export function useUpdateBillplzSettings(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BillplzSettingsInput) => updateBillplzSettings(operatorId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-operator', operatorId] }),
  })
}

export function useDisableBillplz(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => disableBillplz(operatorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-operator', operatorId] }),
  })
}

export function useTestBillplzConnection(operatorId: number) {
  return useMutation({ mutationFn: () => testBillplzConnection(operatorId) })
}
