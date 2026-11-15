import { Redirect, Slot } from 'expo-router'
import { APP_VARIANT } from '../../src/lib/variant'

/** The parent section only exists in the parent app — any other variant is bounced home. */
export default function ParentSectionLayout() {
  if (APP_VARIANT !== 'parent') return <Redirect href="/" />
  return <Slot />
}
