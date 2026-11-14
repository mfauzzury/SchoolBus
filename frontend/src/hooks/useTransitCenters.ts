import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTransitCenter,
  getTransitCenter,
  listTransitCenters,
  sendTransitCenterLogin,
  updateTransitCenter,
  type TransitCenterInput,
} from '@/api/transitCenters'

export function useTransitCenters() {
  return useQuery({ queryKey: ['transit-centers'], queryFn: listTransitCenters })
}

export function useTransitCenter(id?: number) {
  return useQuery({
    queryKey: ['transit-centers', id],
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
