import { useQuery } from '@tanstack/react-query'
import { getMyCenter } from '@/api/transitPortal'

export function useMyCenter() {
  return useQuery({ queryKey: ['transit', 'center'], queryFn: getMyCenter })
}
