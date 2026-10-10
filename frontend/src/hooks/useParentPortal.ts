import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmPayment,
  getPaymentAttempt,
  getPaymentConfig,
  getQuote,
  listMyInvoices,
  listMyStudentApplications,
  listMyStudents,
  listParentRoutes,
  startPayment,
  submitStudentApplication,
  updateParentPassword,
  updateMyStudent,
  updateParentProfile,
  uploadMyStudentAvatar,
  uploadParentAvatar,
  type ApplyInput,
  type BillplzRedirectParams,
  type QuoteInput,
  type UpdateMyStudentInput,
  type UpdatePasswordInput,
  type UpdateParentProfileInput,
} from '@/api/parentPortal'

export function useParentRoutes() {
  return useQuery({ queryKey: ['parent-routes'], queryFn: listParentRoutes })
}

export function useMyStudents() {
  return useQuery({ queryKey: ['my-students'], queryFn: listMyStudents })
}

export function useUpdateMyStudent(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMyStudentInput) => updateMyStudent(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-students'] }),
  })
}

export function useUploadMyStudentAvatar(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadMyStudentAvatar(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-students'] }),
  })
}

export function useMyStudentApplications() {
  return useQuery({ queryKey: ['my-student-applications'], queryFn: listMyStudentApplications })
}

export function useMyInvoices() {
  return useQuery({ queryKey: ['my-invoices'], queryFn: listMyInvoices })
}

export function usePaymentConfig() {
  return useQuery({ queryKey: ['payment-config'], queryFn: getPaymentConfig })
}

export function useStartPayment() {
  return useMutation({ mutationFn: (invoiceIds: number[]) => startPayment(invoiceIds) })
}

/**
 * Polls our own record of the checkout (never Billplz) until it settles. The
 * callback from Billplz is what flips it to paid, so this stops once it has, or
 * after ~30s and lets the page show a "still waiting" state.
 */
export function usePaymentAttempt(id: number, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['payment-attempt', id],
    queryFn: async () => {
      const attempt = await getPaymentAttempt(id)
      if (attempt.status === 'paid') {
        queryClient.invalidateQueries({ queryKey: ['my-invoices'] })
        queryClient.invalidateQueries({ queryKey: ['my-students'] })
      }
      return attempt
    },
    enabled,
    refetchInterval: (query) => (query.state.data?.status === 'paid' ? false : 3000),
  })
}

export function useConfirmPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, billplz }: { id: number; billplz: BillplzRedirectParams }) =>
      confirmPayment(id, billplz),
    onSuccess: (attempt) => {
      queryClient.setQueryData(['payment-attempt', attempt.id], attempt)
      if (attempt.status === 'paid') {
        queryClient.invalidateQueries({ queryKey: ['my-invoices'] })
        queryClient.invalidateQueries({ queryKey: ['my-students'] })
      }
    },
  })
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

export function useUploadParentAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadParentAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUpdateParentPassword() {
  return useMutation({
    mutationFn: (input: UpdatePasswordInput) => updateParentPassword(input),
  })
}
