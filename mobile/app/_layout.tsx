import { Stack } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../src/api/queryClient'
import { APP_VARIANT } from '../src/lib/variant'

// Background location is a driver-app feature (the parent app doesn't ask for
// that permission). Loaded here, not on a screen, because the background task
// must exist the moment the app starts.
if (APP_VARIANT === 'driver') {
  require('../src/lib/tripTracking')
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  )
}
