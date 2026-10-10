import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Receipt, User, Users } from 'lucide-react'
import { useMyInvoices } from '@/hooks/useParentPortal'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/features'

/**
 * Mobile-only (lg:hidden) floating tab bar — replaces the top header's nav
 * entirely below the lg breakpoint (see ParentLayout). Theme/language/logout
 * moved to the Profile page since there's no header left to hold them.
 */
export function ParentBottomNav() {
  const { t } = useTranslation()
  const { data: invoices } = useMyInvoices()
  const unpaidCount = invoices?.filter((inv) => inv.status === 'issued' || inv.status === 'overdue').length ?? 0

  const items = [
    { to: '/parent/dashboard', label: t('nav.myChildren'), icon: Users, count: 0 },
    ...(FEATURES.parentTrack ? [{ to: '/parent/track', label: t('nav.track'), icon: MapPin, count: 0 }] : []),
    { to: '/parent/invoices', label: t('nav.invoices'), icon: Receipt, count: unpaidCount },
    { to: '/parent/profile', label: t('nav.profile'), icon: User, count: 0 },
  ]

  return (
    <nav
      aria-label={t('nav.myChildren')}
      className="fixed inset-x-4 z-20 flex items-center justify-around rounded-full border bg-background/95 shadow-lg backdrop-blur-sm lg:hidden"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'relative flex items-center justify-center rounded-full p-1.5',
                  isActive && 'bg-primary/10',
                )}
              >
                <item.icon className="size-5" />
                {item.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                    {item.count}
                  </span>
                )}
              </span>
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
