import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMe,
  forgotPassword,
  login,
  logout,
  resetPassword,
  type ResetPasswordInput,
} from '@/api/auth'

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
    mutationFn: ({
      email,
      password,
      remember,
    }: {
      email: string
      password: string
      remember: boolean
    }) => login(email, password, remember),
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data)
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  })
}

export function useIsOperatorAdmin() {
  const { data } = useMe()
  return data?.roles.includes('operator_admin') ?? false
}

export function useIsSaasAdmin() {
  const { data } = useMe()
  return data?.roles.includes('saas_admin') ?? false
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear immediately (not invalidateQueries) so stale cached user data
      // can't still look "authenticated" to the response interceptor if a
      // request happens to land right after logout.
      queryClient.setQueryData(['me'], null)
    },
  })
}
