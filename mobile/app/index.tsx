import { Redirect } from 'expo-router'
import { HOME_PATH } from '../src/lib/variant'

/** Each app variant opens straight into its own section. */
export default function Index() {
  return <Redirect href={HOME_PATH} />
}
