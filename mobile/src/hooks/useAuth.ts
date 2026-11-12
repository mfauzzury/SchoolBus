import { useMutation, useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { fetchMe, logout as logoutRequest } from '../api/auth'
import { clearToken } from '../lib/secureToken'
import { LOGIN_PATH } from '../lib/variant'

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: fetchMe })
}

export function useLogout() {
  return useMutation({
    mutationFn: logoutRequest,
    onSettled: async () => {
      await clearToken()
      router.replace(LOGIN_PATH)
    },
  })
}
