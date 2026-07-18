import { useMe } from './useAuth'

export function useTenant() {
  const { data, ...rest } = useMe()

  return { tenant: data?.tenant, ...rest }
}
