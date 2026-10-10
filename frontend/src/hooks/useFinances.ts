import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  addInvoiceAdjustment,
  createInvoice,
  getDashboardSummary,
  getInvoice,
  listInvoices,
  listOutstanding,
  listTransactions,
  recordPayment,
  removeInvoiceAdjustment,
  voidInvoice,
  type AdjustmentInput,
  type CreateInvoiceInput,
  type InvoiceFilters,
  type RecordPaymentInput,
  type TransactionFilters,
} from '@/api/finances'

// Any change to a bill or its payments moves all four finance views at once.
function invalidateFinances(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['operator-invoices'] })
  queryClient.invalidateQueries({ queryKey: ['operator-invoice'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
  queryClient.invalidateQueries({ queryKey: ['operator-transactions'] })
  queryClient.invalidateQueries({ queryKey: ['operator-outstanding'] })
  queryClient.invalidateQueries({ queryKey: ['operator-students'] })
}

export function useInvoices(filters: InvoiceFilters, enabled = true) {
  return useQuery({
    queryKey: ['operator-invoices', filters],
    queryFn: () => listInvoices(filters),
    enabled,
  })
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: ['operator-invoice', id],
    queryFn: () => getInvoice(id),
    enabled: Number.isFinite(id),
  })
}

export function useDashboardSummary(filters: Omit<InvoiceFilters, 'status'>) {
  return useQuery({
    queryKey: ['dashboard-summary', filters],
    queryFn: () => getDashboardSummary(filters),
  })
}

export function useTransactions(filters: TransactionFilters, enabled = true) {
  return useQuery({
    queryKey: ['operator-transactions', filters],
    queryFn: () => listTransactions(filters),
    enabled,
  })
}

export function useOutstanding(enabled = true) {
  return useQuery({
    queryKey: ['operator-outstanding'],
    queryFn: listOutstanding,
    enabled,
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: number; input: RecordPaymentInput }) =>
      recordPayment(invoiceId, input),
    onSuccess: () => invalidateFinances(queryClient),
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => createInvoice(input),
    onSuccess: () => invalidateFinances(queryClient),
  })
}

export function useAddInvoiceAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: number; input: AdjustmentInput }) =>
      addInvoiceAdjustment(invoiceId, input),
    onSuccess: () => invalidateFinances(queryClient),
  })
}

export function useRemoveInvoiceAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, itemId }: { invoiceId: number; itemId: number }) =>
      removeInvoiceAdjustment(invoiceId, itemId),
    onSuccess: () => invalidateFinances(queryClient),
  })
}

export function useVoidInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: number; reason: string }) =>
      voidInvoice(invoiceId, reason),
    onSuccess: () => invalidateFinances(queryClient),
  })
}
