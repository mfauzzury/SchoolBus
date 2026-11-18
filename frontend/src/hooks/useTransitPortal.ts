import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelTransitRequest,
  createTransitRequest,
  getMyCenter,
  getTransitStats,
  listMyTransitRequests,
  listTransitChildren,
  searchTransitStudents,
  type TransitRequestInput,
} from '@/api/transitPortal'

export function useMyCenter() {
  return useQuery({ queryKey: ['transit', 'center'], queryFn: getMyCenter })
}

export function useTransitStats() {
  return useQuery({ queryKey: ['transit', 'stats'], queryFn: getTransitStats })
}

export function useTransitStudentSearch(q: string) {
  const query = q.trim()
  return useQuery({
    queryKey: ['transit', 'students', query],
    queryFn: () => searchTransitStudents(query),
    enabled: query.length >= 3,
  })
}

export function useTransitChildren() {
  return useQuery({ queryKey: ['transit', 'children'], queryFn: listTransitChildren })
}

export function useMyTransitRequests() {
  return useQuery({ queryKey: ['transit', 'requests'], queryFn: listMyTransitRequests })
}

function useInvalidateTransit() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['transit'] })
}

export function useCreateTransitRequest() {
  const invalidate = useInvalidateTransit()
  return useMutation({ mutationFn: (input: TransitRequestInput) => createTransitRequest(input), onSuccess: invalidate })
}

export function useCancelTransitRequest() {
  const invalidate = useInvalidateTransit()
  return useMutation({ mutationFn: (id: number) => cancelTransitRequest(id), onSuccess: invalidate })
}
