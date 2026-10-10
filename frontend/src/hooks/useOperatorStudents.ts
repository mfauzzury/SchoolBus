import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
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
