import { Redirect, Slot } from 'expo-router'
import { APP_VARIANT } from '../../src/lib/variant'

/** The driver section only exists in the driver app — any other variant is bounced home. */
export default function DriverSectionLayout() {
  if (APP_VARIANT !== 'driver') return <Redirect href="/" />
  return <Slot />
}
