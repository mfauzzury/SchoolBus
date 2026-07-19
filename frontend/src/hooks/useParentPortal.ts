import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getQuote,
  listMyInvoices,
  listMyStudentApplications,
  listMyStudents,
  listParentRoutes,
  submitStudentApplication,
  updateParentProfile,
  type ApplyInput,
  type QuoteInput,
  type UpdateParentProfileInput,
} from '@/api/parentPortal'

export function useParentRoutes() {
  return useQuery({ queryKey: ['parent-routes'], queryFn: listParentRoutes })
}

export function useMyStudents() {
  return useQuery({ queryKey: ['my-students'], queryFn: listMyStudents })
}

export function useMyStudentApplications() {
  return useQuery({ queryKey: ['my-student-applications'], queryFn: listMyStudentApplications })
}

export function useMyInvoices() {
  return useQuery({ queryKey: ['my-invoices'], queryFn: listMyInvoices })
}

export function useQuote() {
  return useMutation({ mutationFn: (input: QuoteInput) => getQuote(input) })
}

export function useSubmitStudentApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ApplyInput) => submitStudentApplication(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-student-applications'] })
    },
  })
}

export function useUpdateParentProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateParentProfileInput) => updateParentProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
