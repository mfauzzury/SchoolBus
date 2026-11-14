import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMyCenter } from '@/hooks/useTransitPortal'
import { TRANSIT_LEGS } from '@/api/billingConfig'
import { formatMoney } from '@/lib/utils'

/** Start page for a transit center: who its bus operator is and what each leg costs. */
export function TransitHome() {
  const { t } = useTranslation()
  const { data: center, isLoading } = useMyCenter()

  if (isLoading || !center) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t('transit.portal.welcome', { name: center.name })}</h1>
        <p className="text-sm text-muted-foreground">
          {t('transit.portal.intro', { operator: center.operator.company_name })}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('transit.portal.prices')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('transit.portal.pricesHint')}</p>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {TRANSIT_LEGS.map((leg) => {
              const price = center.transit_prices[leg]
              return (
                <div key={leg} className="flex items-center justify-between py-2 text-sm">
                  <span>{t(`transit.legs.${leg}`)}</span>
                  <span className="font-medium">
                    {price === null ? t('transit.portal.askOperator') : `RM ${formatMoney(price)} / ${t('transit.portal.month')}`}
                  </span>
                </div>
              )
            })}
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
