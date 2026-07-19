import axios from 'axios'
import { queryClient } from '@/lib/queryClient'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  withXSRFToken: true,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only treat this as a session *expiring* (not "never logged in") if we
    // still have cached user data from a previous successful /api/me — an
    // anonymous visitor's own 401 on /api/me shouldn't force a redirect.
    const wasAuthenticated = Boolean(queryClient.getQueryData(['me']))

    if (error.response?.status === 401 && wasAuthenticated) {
      queryClient.setQueryData(['me'], null)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1'
      }
    }

    return Promise.reject(error)
  },
)
