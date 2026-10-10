import axios from 'axios'
import { queryClient } from '@/lib/queryClient'

// Falls back to whatever host served this page (same host, port 8000) when
// VITE_API_URL isn't set — so the same dev build works whether it's opened
// via localhost or a LAN IP (e.g. testing on a phone), with no per-device
// .env edits. A real deployment sets VITE_API_URL explicitly and that
// always wins. Cookie-based auth requires the API to share the page's
// hostname anyway (SameSite=Lax blocks cross-site fetch cookies), so this
// mirrors the only configuration that can actually work.
export const apiBaseUrl =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
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
