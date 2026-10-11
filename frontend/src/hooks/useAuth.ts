import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMe,
  forgotPassword,
  login,
  logout,
  resetPassword,
  type ResetPasswordInput,
} from '@/api/auth'
import { isPlatformUser } from '@/lib/platform'

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

export function useIsPlatformUser() {
  const { data } = useMe()
  return data ? isPlatformUser(data.roles) : false
}

/** Whether the logged-in platform-team member may do `permission` (e.g. 'team.manage'). */
export function useCan(permission: string) {
  const { data } = useMe()
  return data?.permissions?.includes(permission) ?? false
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
