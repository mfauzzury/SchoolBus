import { apiClient } from './client'

export interface ActiveAnnouncement {
  id: number
  title: string
  body: string
  title_ms: string | null
  body_ms: string | null
}

export async function getActiveAnnouncements(): Promise<ActiveAnnouncement[]> {
  const { data } = await apiClient.get<ActiveAnnouncement[]>('/api/operator/announcements/active')
  return data
}
