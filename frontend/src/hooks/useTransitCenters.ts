import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTransitCenter,
  getTransitCenter,
  listOperatorTransitCenters,
  listTransitCenters,
  sendTransitCenterLogin,
  updateTransitCenter,
  type TransitCenterInput,
} from '@/api/transitCenters'

/** The operator's own centers (look only). */
export function useOperatorTransitCenters() {
  return useQuery({ queryKey: ['transit-centers', 'operator'], queryFn: listOperatorTransitCenters })
}

// ---- platform team ----

export function useTransitCenters(operatorId?: number) {
  return useQuery({ queryKey: ['transit-centers', 'admin', operatorId ?? 'all'], queryFn: () => listTransitCenters(operatorId) })
}

export function useTransitCenter(id?: number) {
  return useQuery({
    queryKey: ['transit-centers', 'admin', 'detail', id],
    queryFn: () => getTransitCenter(id as number),
    enabled: id !== undefined,
  })
}

export function useCreateTransitCenter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TransitCenterInput) => createTransitCenter(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transit-centers'] }),
  })
}

export function useUpdateTransitCenter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TransitCenterInput }) => updateTransitCenter(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transit-centers'] }),
  })
}

export function useSendTransitCenterLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => sendTransitCenterLogin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transit-centers'] }),
  })
}
