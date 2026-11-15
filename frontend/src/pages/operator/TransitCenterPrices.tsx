import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackLink } from '@/components/BackLink'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useOperatorTransitCenter, useUpdateTransitCenterPrices } from '@/hooks/useTransitCenters'
import { TRANSIT_LEGS, type TransitLeg } from '@/api/billingConfig'
import { AFTER_SCHOOL_LEGS, BEFORE_SCHOOL_LEGS } from '@/lib/transit'

type Prices = Record<TransitLeg, string>

const EMPTY: Prices = { school_to_center: '', center_to_home: '', home_to_center: '', center_to_school: '' }

/**
 * One transit center and what it is charged each month for each part of the
 * day. The center sees these as an estimate when it asks for a bus; the
 * operator can still change the price when approving each request.
 */
export function TransitCenterPrices() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const centerId = Number(id)
  const isAdmin = useIsOperatorAdmin()
  const { data: center, isLoading } = useOperatorTransitCenter(centerId)
  const save = useUpdateTransitCenterPrices(centerId)
  const [prices, setPrices] = useState<Prices>(EMPTY)

  useEffect(() => {
    if (center) {
      setPrices(
        Object.fromEntries(
          TRANSIT_LEGS.map((leg) => [leg, center.leg_prices[leg] === null ? '' : String(center.leg_prices[leg])]),
        ) as Prices,
      )
    }
  }, [center])

  if (isLoading || !center) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const valid = TRANSIT_LEGS.every((leg) => prices[leg] === '' || Number(prices[leg]) >= 0)
  const message = isAxiosError(save.error) ? save.error.response?.data?.message : undefined

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    save.mutate(
      Object.fromEntries(TRANSIT_LEGS.map((leg) => [leg, prices[leg] === '' ? null : Number(prices[leg])])) as Record<
        TransitLeg,
        number | null
      >,
    )
  }

  const groups: { title: string; legs: TransitLeg[] }[] = [
    { title: t('operator.settings.transitAfterSchool'), legs: AFTER_SCHOOL_LEGS },
    { title: t('operator.settings.transitBeforeSchool'), legs: BEFORE_SCHOOL_LEGS },
  ]

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/operator/transit-centers">{t('operator.transitCenters.back')}</BackLink>

      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{center.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {[center.contact_person, center.phone].filter(Boolean).join(' · ')}
            </p>
            {center.address && <p className="text-sm text-muted-foreground">{center.address}</p>}
          </div>
          <Badge variant={center.status === 'active' ? 'success' : 'outline'}>{t(`common.status.${center.status}`)}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t('operator.transitCenters.addedByPlatform')}</p>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t('operator.transitCenters.pricesTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('operator.settings.transitPricesDescription')}</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            {groups.map((group, index) => (
              <div key={group.title} className={index > 0 ? 'border-t pt-4' : undefined}>
                <p className="mb-3 text-sm font-medium">{group.title}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {group.legs.map((leg) => (
                    <div key={leg} className="flex flex-col gap-1.5">
                      <Label htmlFor={`transit_${leg}`}>{t(`transit.legs.${leg}`)}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">RM</span>
                        <Input
                          id={`transit_${leg}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          disabled={!isAdmin}
                          value={prices[leg]}
                          onChange={(e) => setPrices((p) => ({ ...p, [leg]: e.target.value }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{t('operator.settings.transitPricesHint')}</p>

            {!valid && <p className="text-sm text-destructive">{t('operator.settings.transitPricesError')}</p>}
            {save.isError && (
              <p role="alert" className="text-sm text-destructive">
                {message ?? t('operator.settings.saveError')}
              </p>
            )}
            {save.isSuccess && <p className="text-sm text-muted-foreground">{t('common.saved')}</p>}

            {isAdmin && (
              <Button type="submit" className="w-fit" disabled={!valid || save.isPending}>
                {save.isPending ? t('common.saving') : t('operator.settings.saveChanges')}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
