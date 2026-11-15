import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMyCenter } from '@/hooks/useTransitPortal'
import { cn, formatMoney } from '@/lib/utils'

/** Start page for a transit center: who its bus operator is and what it costs per child each month. */
export function TransitHome() {
  const { t } = useTranslation()
  const { data: center, isLoading } = useMyCenter()

  if (isLoading || !center) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t('transit.portal.welcome', { name: center.name })}</h1>
          <p className="text-sm text-muted-foreground">
            {t('transit.portal.intro', { operator: center.operator.company_name })}
          </p>
        </div>
        <Link to="/transit/new" className={cn(buttonVariants({ size: 'lg' }))}>
          {t('transit.portal.askForBus')}
        </Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('transit.portal.prices')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('transit.portal.pricesHint')}</p>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {center.monthly_price === null
                ? t('transit.portal.askOperator')
                : `RM ${formatMoney(center.monthly_price)} / ${t('transit.portal.month')}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('transit.portal.operator')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{center.operator.company_name}</span>
            {center.operator.contact_phone && <span>{center.operator.contact_phone}</span>}
            {center.operator.email && <span className="text-muted-foreground">{center.operator.email}</span>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
