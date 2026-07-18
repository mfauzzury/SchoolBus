import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProfile, uploadLogo, type ProfileInput } from '@/api/profile'

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => updateProfile(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useUploadLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}
