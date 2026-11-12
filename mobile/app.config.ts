import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * One codebase, two store apps. APP_VARIANT picks which one this build (or
 * dev server) is:
 *
 *   APP_VARIANT=parent → "BasSekolah"         (my.bassekolah.parent)
 *   APP_VARIANT=driver → "BasSekolah Driver"  (my.bassekolah.driver)
 *
 * Shared settings live in app.json; this file only layers the per-app
 * differences on top. Anything that needs a sensitive OS permission (e.g.
 * background location) must be added to the driver variant only — Apple
 * rejects apps that request permissions they don't visibly use.
 */

type AppVariant = 'parent' | 'driver'

const VARIANTS: Record<AppVariant, { name: string; id: string; scheme: string }> = {
  parent: { name: 'BasSekolah', id: 'my.bassekolah.parent', scheme: 'bassekolah' },
  driver: { name: 'BasSekolah Driver', id: 'my.bassekolah.driver', scheme: 'bassekolah-driver' },
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant: AppVariant = process.env.APP_VARIANT === 'parent' ? 'parent' : 'driver'
  const app = VARIANTS[variant]

  return {
    ...config,
    name: app.name,
    slug: 'bassekolah',
    scheme: app.scheme,
    ios: { ...config.ios, bundleIdentifier: app.id },
    android: { ...config.android, package: app.id },
    extra: { ...config.extra, appVariant: variant },
  }
}
