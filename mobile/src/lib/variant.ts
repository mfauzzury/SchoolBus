import Constants from 'expo-constants'

/**
 * Which app this bundle is running as — set at build/dev-server time by
 * APP_VARIANT in app.config.ts. Each variant only ever navigates within its
 * own route section (app/driver/* or app/parent/*).
 */
export type AppVariant = 'parent' | 'driver'

export const APP_VARIANT: AppVariant =
  Constants.expoConfig?.extra?.appVariant === 'parent' ? 'parent' : 'driver'

export const HOME_PATH = APP_VARIANT === 'parent' ? '/parent' : '/driver'
export const LOGIN_PATH = APP_VARIANT === 'parent' ? '/parent/login' : '/driver/login'
