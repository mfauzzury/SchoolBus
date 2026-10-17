import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_BRAND,
  getBrand,
  removeBrandFile,
  saveBrandName,
  uploadBrandFile,
  type Brand,
  type BrandPart,
} from '@/api/brand'

const CACHE_KEY = 'brand'

// The last brand this browser saw, so a custom logo doesn't flash the default on every visit.
function cachedBrand(): Brand | undefined {
  try {
    const value = localStorage.getItem(CACHE_KEY)
    return value ? (JSON.parse(value) as Brand) : undefined
  } catch {
    return undefined
  }
}

/** The platform brand, with the built-in one until (or unless) the server says otherwise. */
export function useBrand() {
  const query = useQuery({
    queryKey: ['brand'],
    queryFn: getBrand,
    staleTime: 5 * 60_000,
    initialData: cachedBrand,
    // Treat the cached copy as old, so it is checked against the server straight away.
    initialDataUpdatedAt: 0,
  })
  return query.data ?? DEFAULT_BRAND
}

const DEFAULT_ICON = '/icons/favicon-32.png'
const DEFAULT_TOUCH_ICON = '/icons/apple-touch-icon.png'

function setLink(rel: string, href: string, type?: string) {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) return
  link.href = href
  if (type) link.type = type
}

/** Keeps the browser tab (icon and title) in step with the brand. Mounted once, near the root. */
export function BrandHead() {
  const brand = useBrand()

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(brand))
    } catch {
      // Only a convenience.
    }

    if (brand.icon_svg_url) setLink('icon', brand.icon_svg_url, 'image/svg+xml')
    else setLink('icon', brand.icon_url ?? DEFAULT_ICON, brand.icon_url ? '' : 'image/png')
    // Phones want a PNG for the home-screen shortcut.
    setLink('apple-touch-icon', brand.icon_url ?? DEFAULT_TOUCH_ICON)
    document.title = brand.name
  }, [brand])

  return null
}

function useBrandMutation<T>(fn: (input: T) => Promise<Brand>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (brand) => {
      queryClient.setQueryData(['brand'], brand)
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export const useSaveBrandName = () => useBrandMutation((name: string) => saveBrandName(name))

export const useUploadBrandFile = () =>
  useBrandMutation(({ part, file }: { part: BrandPart; file: File }) => uploadBrandFile(part, file))

export const useRemoveBrandFile = () =>
  useBrandMutation(({ part, svgOnly }: { part: BrandPart; svgOnly?: boolean }) => removeBrandFile(part, svgOnly))
