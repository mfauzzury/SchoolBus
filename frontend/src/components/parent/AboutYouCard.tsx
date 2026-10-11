import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMe } from '@/hooks/useAuth'
import { useUpdateParentAbout } from '@/hooks/useParentPortal'
import { INCOME_RANGES, WORKING_FIELDS } from '@/lib/parentAbout'

/**
 * Three optional questions about the family. Kept as its own small form so a
 * parent can answer without touching the rest of their profile.
 */
export function AboutYouCard() {
  const { t } = useTranslation()
  const { data } = useMe()
  const save = useUpdateParentAbout()
  const profile = data?.parentProfile

  const [income, setIncome] = useState<string | null>(profile?.income_range ?? null)
  const [occupation, setOccupation] = useState(profile?.occupation ?? '')
  const [field, setField] = useState<string | null>(profile?.working_field ?? null)
  const [saved, setSaved] = useState(false)

  const answered = [income, occupation.trim() || null, field].filter(Boolean).length

  const incomeItems = Object.fromEntries(
    INCOME_RANGES.map((value) => [value, t(`parent.about.incomeOptions.${value}`)]),
  )
  const fieldItems = Object.fromEntries(
    WORKING_FIELDS.map((value) => [value, t(`parent.about.fieldOptions.${value}`)]),
  )

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSaved(false)
    save.mutate(
      { income_range: income, occupation: occupation.trim() || null, working_field: field },
      { onSuccess: () => setSaved(true) },
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">{t('parent.about.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('parent.about.intro')}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t('parent.about.income')}</Label>
            <Select items={incomeItems} value={income} onValueChange={(v) => setIncome(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('parent.about.incomePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {INCOME_RANGES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {incomeItems[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="about_occupation">{t('parent.about.occupation')}</Label>
            <Input
              id="about_occupation"
              value={occupation}
              maxLength={100}
              placeholder={t('parent.about.occupationPlaceholder')}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('parent.about.field')}</Label>
            <Select items={fieldItems} value={field} onValueChange={(v) => setField(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('parent.about.fieldPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {WORKING_FIELDS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {fieldItems[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            {t('parent.about.privacy')}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('common.saving') : t('common.save')}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t('parent.about.progress', { done: answered })}
            </span>
            {saved && !save.isError && (
              <span role="status" className="text-sm text-muted-foreground">
                {t('common.saved')}
              </span>
            )}
            {save.isError && (
              <span role="alert" className="text-sm text-destructive">
                {t('parent.profile.saveError')}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
