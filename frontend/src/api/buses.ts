import { apiClient } from './client'

export interface Bus {
  id: number
  plate_number: string
  capacity: number
  status: 'active' | 'maintenance' | 'retired'
  avatar_url: string | null
}

export type BusInput = Omit<Bus, 'id' | 'avatar_url'>

export async function listBuses(): Promise<Bus[]> {
  const { data } = await apiClient.get<Bus[]>('/api/operator/buses')
  return data
}

export async function createBus(input: BusInput): Promise<Bus> {
  const { data } = await apiClient.post<Bus>('/api/operator/buses', input)
  return data
}

export async function updateBus(id: number, input: Partial<BusInput>): Promise<Bus> {
  const { data } = await apiClient.put<Bus>(`/api/operator/buses/${id}`, input)
  return data
}

export async function deleteBus(id: number): Promise<void> {
  await apiClient.delete(`/api/operator/buses/${id}`)
}

export async function uploadBusAvatar(id: number, file: File): Promise<Bus> {
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await apiClient.post<Bus>(`/api/operator/buses/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
