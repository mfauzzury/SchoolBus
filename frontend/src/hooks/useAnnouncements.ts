import { useQuery } from '@tanstack/react-query'
import { getActiveAnnouncements } from '@/api/announcements'

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: ['active-announcements'],
    queryFn: getActiveAnnouncements,
    // A notice can start or end while the page is open.
    refetchInterval: 5 * 60_000,
  })
}
