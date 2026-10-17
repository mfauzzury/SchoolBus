import { useBrand } from '@/hooks/useBrand'
import { cn } from '@/lib/utils'
import type { Brand } from '@/api/brand'

/** The built-in mark: two stops joined by a route. */
export function BrandMark() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="2.5" cy="7" r="1.6" fill="currentColor" className="text-primary-foreground" />
        <circle cx="11.5" cy="7" r="1.6" fill="currentColor" className="text-primary-foreground" />
        <line
          x1="4.3"
          y1="7"
          x2="9.7"
          y2="7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          className="text-primary-foreground"
        />
      </svg>
    </span>
  )
}

/**
 * The brand for a header or footer: the Owner's wide logo (SVG when there is one),
 * otherwise the built-in mark and the name. Sits inside a flex row with a gap.
 * `brand` lets a preview show a brand that isn't the live one.
 */
export function BrandLogo({
  accentDomain = false,
  className,
  brand: given,
}: {
  /** Shows a trailing ".my" in the brand colour, as the marketing header does. */
  accentDomain?: boolean
  className?: string
  brand?: Brand
}) {
  const live = useBrand()
  const brand = given ?? live
  const src = brand.logo_svg_url ?? brand.logo_url

  if (src) {
    return <img src={src} alt={brand.name} className={cn('h-7 w-auto max-w-48 object-contain', className)} />
  }

  const domain = accentDomain && brand.name.endsWith('.my')
  return (
    <>
      <BrandMark />
      {domain ? (
        <span>
          {brand.name.slice(0, -3)}
          <span className="font-mono text-primary">.my</span>
        </span>
      ) : (
        <span>{brand.name}</span>
      )}
    </>
  )
}
