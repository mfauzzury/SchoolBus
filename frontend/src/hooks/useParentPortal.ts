import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  enrollStudent,
  getQuote,
  listMyInvoices,
  listMyStudents,
  listParentRoutes,
  type EnrollInput,
  type QuoteInput,
} from '@/api/parentPortal'

export function useParentRoutes() {
  return useQuery({ queryKey: ['parent-routes'], queryFn: listParentRoutes })
}

export function useMyStudents() {
  return useQuery({ queryKey: ['my-students'], queryFn: listMyStudents })
}

export function useMyInvoices() {
  return useQuery({ queryKey: ['my-invoices'], queryFn: listMyInvoices })
}

export function useQuote() {
  return useMutation({ mutationFn: (input: QuoteInput) => getQuote(input) })
}

export function useEnrollStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EnrollInput) => enrollStudent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-students'] })
      queryClient.invalidateQueries({ queryKey: ['my-invoices'] })
    },
  })
}
