import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createStaff, deleteStaff, listStaff, updateStaff, uploadStaffAvatar, type StaffInput } from '@/api/staff'

export function useStaff(role?: 'driver' | 'conductor') {
  return useQuery({ queryKey: ['staff', role ?? 'all'], queryFn: () => listStaff(role) })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StaffInput) => createStaff(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<StaffInput> }) =>
      updateStaff(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export function useDeleteStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteStaff(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export function useUploadStaffAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadStaffAvatar(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })
}
