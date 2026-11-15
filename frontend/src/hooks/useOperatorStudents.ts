import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  endTransitPlan,
  getOperatorStudent,
  listOperatorStudents,
  updateOperatorStudent,
  type StudentBillingInput,
  type StudentFilters,
} from '@/api/operatorStudents'

export function useOperatorStudents(filters: StudentFilters) {
  return useQuery({
    queryKey: ['operator-students', filters],
    queryFn: () => listOperatorStudents(filters),
  })
}

export function useOperatorStudent(id: number) {
  return useQuery({
    queryKey: ['operator-student', id],
    queryFn: () => getOperatorStudent(id),
    enabled: Number.isFinite(id),
  })
}

export function useUpdateOperatorStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: StudentBillingInput }) =>
      updateOperatorStudent(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-students'] })
      queryClient.invalidateQueries({ queryKey: ['operator-student'] })
    },
  })
}

export function useEndTransitPlan(studentId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, endsOn }: { requestId: number; endsOn: string }) =>
      endTransitPlan(studentId, requestId, endsOn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['transit-requests'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
