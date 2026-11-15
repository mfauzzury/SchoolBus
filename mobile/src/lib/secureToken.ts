import * as SecureStore from 'expo-secure-store'
import { APP_VARIANT } from './variant'

// Per-variant key: in Expo Go both apps share one keychain, so a parent
// token must never be picked up by the driver app (or vice versa).
const TOKEN_KEY = `${APP_VARIANT}_auth_token`

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}
