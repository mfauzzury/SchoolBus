import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TransitPlanSummary } from '@/api/transitPortal'
import { showDate } from '@/lib/transit'
import { formatMoney } from '@/lib/utils'

/**
 * A child's day via a transit center: each part of it, on which bus, with
 * which driver. The same box for the parent and the operator; the operator
 * passes an "End plan" action as children.
 */
export function TransitPlanCard({
  plan,
  school,
  children,
}: {
  plan: TransitPlanSummary
  school: string
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const center = plan.transit_center

  return (
    <Card className="border-amber-300 dark:border-amber-700">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 shrink-0 text-amber-600" aria-hidden />
            <span className="truncate">{t('transit.plan.title', { name: center?.name ?? '' })}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {plan.ends_on
              ? t('transit.plan.fromUntil', { from: showDate(plan.starts_on), until: showDate(plan.ends_on) })
              : t('transit.children.from', { date: showDate(plan.starts_on) })}
          </p>
        </div>
        {plan.monthly_amount && (
          <span className="shrink-0 text-sm font-medium">
            + RM {formatMoney(plan.monthly_amount)} / {t('transit.portal.month')}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y rounded-md border">
          {plan.rides.map((ride, index) => (
            <li key={index} className="flex flex-col gap-0.5 p-3 text-sm">
              <span className="font-medium">
                {ride.from ?? school} → {ride.to ?? school}
              </span>
              <span className="text-muted-foreground">
                {[ride.route, ride.bus_plate].filter(Boolean).join(' · ')}
                {ride.from === center?.name && plan.leave_center_at &&
                  ` · ${t('transit.plan.leavesAt', { time: plan.leave_center_at })}`}
              </span>
              {ride.driver && (
                <span className="text-muted-foreground">
                  {t('transit.plan.driver', { name: ride.driver.full_name })}
                  {ride.driver.phone && (
                    <>
                      {' · '}
                      <a href={`tel:${ride.driver.phone}`} className="text-primary hover:underline">
                        {ride.driver.phone}
                      </a>
                    </>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
        {center?.phone && (
          <a href={`tel:${center.phone}`} className="flex w-fit items-center gap-1.5 text-sm text-primary hover:underline">
            <Phone className="size-3.5" aria-hidden /> {t('transit.plan.callCenter', { phone: center.phone })}
          </a>
        )}
        {children}
      </CardContent>
    </Card>
  )
}
