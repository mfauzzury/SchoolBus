import { useQuery } from '@tanstack/react-query'
import {
  getOperator,
  getPlatformSummary,
  listOperators,
  listTransactions,
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
