import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBus, deleteBus, listBuses, updateBus, uploadBusAvatar, type BusInput } from '@/api/buses'

export function useBuses() {
  return useQuery({ queryKey: ['buses'], queryFn: listBuses })
}

export function useCreateBus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BusInput) => createBus(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buses'] }),
  })
}

export function useUpdateBus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<BusInput> }) =>
      updateBus(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buses'] }),
  })
}

export function useDeleteBus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteBus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buses'] }),
  })
}

export function useUploadBusAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadBusAvatar(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buses'] }),
  })
}
