import { apiClient } from './client'

/** The platform brand. A null image means "use the built-in BasSekolah mark". */
export interface Brand {
  name: string
  /** Square icon as PNG/JPG/WebP: browser tab, phone, emails. */
  icon_url: string | null
  /** Optional SVG of the icon; the website prefers it because it stays sharp. */
  icon_svg_url: string | null
  /** Wide logo as PNG/JPG/WebP: emails and the mobile apps. */
  logo_url: string | null
  logo_svg_url: string | null
  version: number | null
}

export type BrandPart = 'icon' | 'logo'

export const DEFAULT_BRAND: Brand = {
  name: 'BasSekolah.my',
  icon_url: null,
  icon_svg_url: null,
  logo_url: null,
  logo_svg_url: null,
  version: null,
}

export async function getBrand(): Promise<Brand> {
  const { data } = await apiClient.get<Brand>('/api/brand')
  return data
}

export async function saveBrandName(name: string): Promise<Brand> {
  const { data } = await apiClient.put<Brand>('/api/admin/brand', { name })
  return data
}

/** A PNG/JPG/WebP, or an SVG once the image exists (the server tells them apart). */
export async function uploadBrandFile(part: BrandPart, file: File): Promise<Brand> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<Brand>(`/api/admin/brand/${part}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/** Without `svgOnly`, removes the image entirely and goes back to the built-in mark. */
export async function removeBrandFile(part: BrandPart, svgOnly = false): Promise<Brand> {
  const { data } = await apiClient.delete<Brand>(`/api/admin/brand/${part}`, {
    params: svgOnly ? { format: 'svg' } : undefined,
  })
  return data
}
