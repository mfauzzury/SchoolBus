import { apiClient } from './client'

export interface Bus {
  id: number
  plate_number: string
  capacity: number
  status: 'active' | 'maintenance' | 'retired'
}

export type BusInput = Omit<Bus, 'id'>

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
