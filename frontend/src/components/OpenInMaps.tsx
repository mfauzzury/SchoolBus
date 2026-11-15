import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { directionsUrl } from '@/lib/map'
import { cn } from '@/lib/utils'

/**
 * Opens directions to a place in the person's own maps app (a new tab on a
 * computer). `icon` is a small icon for tight spots like a table row.
 */
export function OpenInMaps({
  lat,
  lng,
  icon = false,
  className,
}: {
  lat: number
  lng: number
  icon?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const label = t('transit.location.openInMaps')

  return (
    <a
      href={directionsUrl({ lat, lng })}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={icon ? label : undefined}
      className={cn(
        icon
          ? 'inline-flex size-7 items-center justify-center rounded-md text-primary hover:bg-muted'
          : buttonVariants({ variant: 'outline', size: 'sm' }),
        className,
      )}
    >
      <MapPin className={icon ? 'size-4' : undefined} aria-hidden />
      {!icon && label}
    </a>
  )
}
