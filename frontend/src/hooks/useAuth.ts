import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMe, login, logout } from '@/api/auth'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data)
    },
  })
}

export function useIsOperatorAdmin() {
  const { data } = useMe()
  return data?.roles.includes('operator_admin') ?? false
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
