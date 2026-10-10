import { useEffect, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useBillingConfig, useUpdateBillingConfig } from '@/hooks/useBillingConfig'
import { useDiscountConfig, useUpdateDiscountConfig } from '@/hooks/useDiscountConfig'
import type { DiscountConfig } from '@/api/discountConfig'

const percentField = z.string().refine((v) => v !== '' && Number(v) >= 0 && Number(v) <= 100)

const discountSchema = z.object({
  sibling_1: percentField,
  sibling_2: percentField,
  sibling_3: percentField,
})

type DiscountForm = z.infer<typeof discountSchema>

function toDiscountFormValues(config?: DiscountConfig): DiscountForm {
  return {
    sibling_1: String(config?.sibling_discounts['1'] ?? 0),
    sibling_2: String(config?.sibling_discounts['2'] ?? 0),
    sibling_3: String(config?.sibling_discounts['3'] ?? 0),
  }
}

function DiscountConfigCard() {
  const { t } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const { data: config, isLoading } = useDiscountConfig()
  const updateConfig = useUpdateDiscountConfig()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DiscountForm>({
    resolver: zodResolver(discountSchema),
    defaultValues: toDiscountFormValues(config),
  })

  useEffect(() => {
    if (config) reset(toDiscountFormValues(config))
  }, [config, reset])

  const onSubmit = (values: DiscountForm) => {
    updateConfig.mutate({
      sibling_discounts: {
        '1': Number(values.sibling_1),
        '2': Number(values.sibling_2),
        '3': Number(values.sibling_3),
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.settings.discountRates')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('operator.settings.discountRatesDescription')}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <p className="mb-3 text-sm font-medium">{t('operator.settings.siblingDiscount')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sibling_1">{t('operator.settings.firstChild')}</Label>
                  <Input id="sibling_1" type="number" disabled={!isAdmin} {...register('sibling_1')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sibling_2">{t('operator.settings.secondChild')}</Label>
                  <Input id="sibling_2" type="number" disabled={!isAdmin} {...register('sibling_2')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sibling_3">{t('operator.settings.thirdChild')}</Label>
                  <Input id="sibling_3" type="number" disabled={!isAdmin} {...register('sibling_3')} />
                </div>
              </div>
              {(errors.sibling_1 || errors.sibling_2 || errors.sibling_3) && (
                <p className="mt-1.5 text-sm text-destructive">{t('operator.settings.rateRangeError')}</p>
              )}
            </div>

            {updateConfig.isError && (
              <p className="text-sm text-destructive">{t('operator.settings.saveError')}</p>
            )}
            {updateConfig.isSuccess && (
              <p className="text-sm text-muted-foreground">{t('common.saved')}</p>
            )}

            {isAdmin && (
              <Button type="submit" disabled={updateConfig.isPending}>
                {updateConfig.isPending ? t('common.saving') : t('operator.settings.saveChanges')}
              </Button>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function monthLabel(month: number, language: string): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
    month: 'long',
  })
}

/**
 * When bills are due and which months are billed. Everyone is billed on the
 * 1st; unticking a month (school holidays) means no bills go out for it.
 */
function BillingConfigCard() {
  const { t, i18n } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const { data: config, isLoading } = useBillingConfig()
  const updateConfig = useUpdateBillingConfig()
  const [dueDay, setDueDay] = useState('7')
  const [billedMonths, setBilledMonths] = useState<number[]>(MONTHS)

  useEffect(() => {
    if (config) {
      setDueDay(String(config.due_day))
      setBilledMonths(config.billed_months)
    }
  }, [config])

  const dueDayValid = Number.isInteger(Number(dueDay)) && Number(dueDay) >= 1 && Number(dueDay) <= 28
  const valid = dueDayValid && billedMonths.length > 0

  const toggleMonth = (month: number, checked: boolean) => {
    setBilledMonths((months) =>
      checked ? [...months, month].sort((a, b) => a - b) : months.filter((m) => m !== month),
    )
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    updateConfig.mutate({ due_day: Number(dueDay), billed_months: billedMonths })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.settings.billing')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('operator.settings.billingDescription')}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due_day">{t('operator.settings.dueDay')}</Label>
              <Input
                id="due_day"
                type="number"
                min="1"
                max="28"
                className="max-w-24"
                disabled={!isAdmin}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('operator.settings.dueDayHint')}</p>
              {!dueDayValid && (
                <p className="text-sm text-destructive">{t('operator.settings.dueDayError')}</p>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium">{t('operator.settings.billedMonths')}</p>
              <p className="mb-3 text-xs text-muted-foreground">{t('operator.settings.billedMonthsHint')}</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {MONTHS.map((month) => (
                  <label key={month} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={billedMonths.includes(month)}
                      onCheckedChange={(checked) => toggleMonth(month, checked)}
                      disabled={!isAdmin}
                    />
                    {monthLabel(month, i18n.language)}
                  </label>
                ))}
              </div>
              {billedMonths.length === 0 && (
                <p className="mt-1.5 text-sm text-destructive">{t('operator.settings.billedMonthsError')}</p>
              )}
            </div>

            {updateConfig.isError && (
              <p className="text-sm text-destructive">{t('operator.settings.saveError')}</p>
            )}
            {updateConfig.isSuccess && <p className="text-sm text-muted-foreground">{t('common.saved')}</p>}

            {isAdmin && (
              <Button type="submit" disabled={!valid || updateConfig.isPending}>
                {updateConfig.isPending ? t('common.saving') : t('operator.settings.saveChanges')}
              </Button>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Everything that decides how families are billed, on one tab: when bills are
 * due and which months are billed, and the sibling discount. (What each route
 * costs is set on the Routes tab.)
 */
export function BillingSettings() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <BillingConfigCard />
      <DiscountConfigCard />
    </div>
  )
}
