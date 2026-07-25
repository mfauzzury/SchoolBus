import { apiClient } from './client'

export interface Staff {
  id: number
  full_name: string
  ic_number: string
  phone: string
  role: 'driver' | 'conductor'
  license_expiry_date: string | null
  status: 'active' | 'inactive'
  avatar_url: string | null
}

export type StaffInput = Omit<Staff, 'id' | 'avatar_url'>

export async function listStaff(role?: 'driver' | 'conductor'): Promise<Staff[]> {
  const { data } = await apiClient.get<Staff[]>('/api/operator/staff', {
    params: role ? { role } : undefined,
  })
  return data
}

export async function createStaff(input: StaffInput): Promise<Staff> {
  const { data } = await apiClient.post<Staff>('/api/operator/staff', input)
  return data
}

export async function updateStaff(id: number, input: Partial<StaffInput>): Promise<Staff> {
  const { data } = await apiClient.put<Staff>(`/api/operator/staff/${id}`, input)
  return data
}

export async function deleteStaff(id: number): Promise<void> {
  await apiClient.delete(`/api/operator/staff/${id}`)
}

export async function uploadStaffAvatar(id: number, file: File): Promise<Staff> {
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await apiClient.post<Staff>(`/api/operator/staff/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
