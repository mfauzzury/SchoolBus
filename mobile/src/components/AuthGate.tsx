import { useEffect, useState, type ReactNode } from 'react'
import { Redirect, Slot } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { getToken } from '../lib/secureToken'
import { LOGIN_PATH } from '../lib/variant'

/**
 * Fast local-token presence check to gate a signed-in route group. The
 * axios interceptor in src/api/client.ts handles the slower-path case
 * (token present but rejected server-side) by clearing it and redirecting.
 */
export function AuthGate({ children }: { children?: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    getToken().then((token) => {
      setHasToken(Boolean(token))
      setChecking(false)
    })
  }, [])

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!hasToken) {
    return <Redirect href={LOGIN_PATH} />
  }

  return children ?? <Slot />
}
