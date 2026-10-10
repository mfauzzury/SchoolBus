import { apiClient } from './client'
import type { Bus } from './buses'
import type { Staff } from './staff'

export interface RouteStop {
  id: number
  name: string
  sequence: number
}

export interface Route {
  id: number
  name: string
  zone: string | null
  school_destination: string | null
  bus_id: number | null
  driver_id: number | null
  conductor_id: number | null
  base_monthly_fee: string | null
  one_way_monthly_fee: string | null
  bus: Bus | null
  driver: Staff | null
  conductor: Staff | null
  stops: RouteStop[]
}

export interface RouteInput {
  name: string
  zone?: string | null
  school_destination?: string | null
  bus_id?: number | null
  driver_id?: number | null
  conductor_id?: number | null
  base_monthly_fee?: number | null
  one_way_monthly_fee?: number | null
  stops?: { name: string; sequence: number }[]
}

export async function listRoutes(): Promise<Route[]> {
  const { data } = await apiClient.get<Route[]>('/api/operator/routes')
  return data
}

export async function createRoute(input: RouteInput): Promise<Route> {
  const { data } = await apiClient.post<Route>('/api/operator/routes', input)
  return data
}

export async function updateRoute(id: number, input: Partial<RouteInput>): Promise<Route> {
  const { data } = await apiClient.put<Route>(`/api/operator/routes/${id}`, input)
  return data
}

export async function deleteRoute(id: number): Promise<void> {
  await apiClient.delete(`/api/operator/routes/${id}`)
}
