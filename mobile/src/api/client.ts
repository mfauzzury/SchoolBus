import axios from 'axios'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { clearToken, getToken } from '../lib/secureToken'
import { LOGIN_PATH } from '../lib/variant'

/**
 * Derives the API host from Metro's own dev-server address (the same LAN IP
 * you scanned the QR code from) rather than a hardcoded .env value — so
 * switching WiFi networks never requires editing anything, here or in
 * mobile/.env. EXPO_PUBLIC_API_URL still wins when set, for a real deployed
 * backend (standalone builds have no Metro hostUri to fall back on anyway).
 */
function resolveApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL

  const hostUri = Constants.expoConfig?.hostUri // e.g. "192.168.50.19:8081"
  const host = hostUri?.split(':')[0]
  if (host) return `http://${host}:8000`

  return 'http://localhost:8000'
}

/**
 * The web portal, for flows the app hands off to the browser (payments,
 * enrollment). Same host derivation as the API; EXPO_PUBLIC_WEB_URL wins.
 */
function resolveWebBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_WEB_URL) return process.env.EXPO_PUBLIC_WEB_URL

  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return host ? `http://${host}:5173` : 'http://localhost:5173'
}

export const webBaseUrl = resolveWebBaseUrl()

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
})

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearToken()
      router.replace(LOGIN_PATH)
    }
    return Promise.reject(error)
  },
)
