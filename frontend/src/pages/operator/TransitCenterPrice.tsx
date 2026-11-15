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
import { useOperatorTransitCenter, useUpdateTransitCenterPrice } from '@/hooks/useTransitCenters'

/**
 * One transit center and what it is charged per child each month, whichever
 * parts of the day the bus covers. The center sees it as an estimate when it
 * asks for a bus; the operator can still change the price when approving each request.
 */
export function TransitCenterPrice() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const centerId = Number(id)
  const isAdmin = useIsOperatorAdmin()
  const { data: center, isLoading } = useOperatorTransitCenter(centerId)
  const save = useUpdateTransitCenterPrice(centerId)
  const [price, setPrice] = useState('')

  useEffect(() => {
    if (center) setPrice(center.monthly_price === null ? '' : String(center.monthly_price))
  }, [center])

  if (isLoading || !center) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const valid = price === '' || Number(price) >= 0
  const message = isAxiosError(save.error) ? save.error.response?.data?.message : undefined

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) save.mutate(price === '' ? null : Number(price))
  }

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
          <CardTitle className="text-base">{t('operator.transitCenters.priceTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('operator.transitCenters.priceDescription')}</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthly_price">{t('operator.transitCenters.priceLabel')}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">RM</span>
                <Input
                  id="monthly_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="max-w-40"
                  disabled={!isAdmin}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('operator.transitCenters.priceHint')}</p>
            </div>

            {!valid && <p className="text-sm text-destructive">{t('operator.transitCenters.priceError')}</p>}
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
