import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveTransitRequest,
  getTransitRequest,
  listTransitRequests,
  rejectTransitRequest,
  type ApproveTransitInput,
} from '@/api/transitRequests'

export function useTransitRequests(status?: string) {
  return useQuery({ queryKey: ['transit-requests', status ?? 'all'], queryFn: () => listTransitRequests(status) })
}

export function useTransitRequest(id: number) {
  return useQuery({ queryKey: ['transit-requests', 'detail', id], queryFn: () => getTransitRequest(id) })
}

function useInvalidate({ routes }: { routes: boolean }) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transit-requests'] })
    // Approving can add the center as a stop on routes.
    if (routes) queryClient.invalidateQueries({ queryKey: ['routes'] })
  }
}

export function useApproveTransitRequest(id: number) {
  const invalidate = useInvalidate({ routes: true })
  return useMutation({ mutationFn: (input: ApproveTransitInput) => approveTransitRequest(id, input), onSuccess: invalidate })
}

export function useRejectTransitRequest(id: number) {
  const invalidate = useInvalidate({ routes: false })
  return useMutation({ mutationFn: (reason: string) => rejectTransitRequest(id, reason), onSuccess: invalidate })
}
