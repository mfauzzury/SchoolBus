import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getDashboardSummary,
  listInvoices,
  recordPayment,
  type InvoiceFilters,
  type RecordPaymentInput,
} from '@/api/finances'

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ['operator-invoices', filters],
    queryFn: () => listInvoices(filters),
  })
}

export function useDashboardSummary(filters: Omit<InvoiceFilters, 'status'>) {
  return useQuery({
    queryKey: ['dashboard-summary', filters],
    queryFn: () => getDashboardSummary(filters),
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: number; input: RecordPaymentInput }) =>
      recordPayment(invoiceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}
