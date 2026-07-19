import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveStudentApplication,
  getStudentApplication,
  listStudentApplications,
  rejectStudentApplication,
  type ApplicationFilters,
  type ApproveApplicationInput,
  type RejectApplicationInput,
} from '@/api/studentApplications'

export function useStudentApplications(filters: ApplicationFilters) {
  return useQuery({
    queryKey: ['student-applications', filters],
    queryFn: () => listStudentApplications(filters),
  })
}

export function useStudentApplication(id: number) {
  return useQuery({
    queryKey: ['student-applications', id],
    queryFn: () => getStudentApplication(id),
  })
}

export function useApproveStudentApplication(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ApproveApplicationInput) => approveStudentApplication(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-applications'] })
      queryClient.invalidateQueries({ queryKey: ['operator-students'] })
    },
  })
}

export function useRejectStudentApplication(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RejectApplicationInput) => rejectStudentApplication(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-applications'] })
    },
  })
}
