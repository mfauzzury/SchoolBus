import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackLink } from '@/components/BackLink'
import { usePlans, useSavePlan } from '@/hooks/useAdmin'
import type { Plan } from '@/api/admin'

export function AdminPlanEdit() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: plans, isLoading } = usePlans()
  const plan = id ? plans?.find((p) => p.id === Number(id)) : undefined

  if (id && isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }
  if (id && !plan) {
    return <p className="text-sm text-muted-foreground">{t('admin.plans.notFound')}</p>
  }

  return <PlanForm plan={plan} />
}

// Separate component so the inputs start from the loaded plan, not from empty.
function PlanForm({ plan }: { plan?: Plan }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const save = useSavePlan(plan?.id)

  const [name, setName] = useState(plan?.name ?? '')
  const [code, setCode] = useState(plan?.code ?? '')
  const [limit, setLimit] = useState(plan?.student_limit?.toString() ?? '')
  const [monthlyPrice, setMonthlyPrice] = useState(plan?.monthly_price ?? '0')
  const [perStudent, setPerStudent] = useState(plan?.price_per_student ?? '0')
  const [isDefault, setIsDefault] = useState(plan?.is_default ?? false)
  const [isActive, setIsActive] = useState(plan?.is_active ?? true)

  const fieldError = (field: string): string | undefined =>
    save.isError && isAxiosError(save.error)
      ? save.error.response?.data?.errors?.[field]?.[0]
      : undefined
  const serverMessage =
    save.isError && isAxiosError(save.error) && !save.error.response?.data?.errors
      ? (save.error.response?.data?.message as string | undefined)
      : undefined

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    save.mutate(
      {
        name: name.trim(),
        code: code.trim().toLowerCase(),
        student_limit: limit.trim() === '' ? null : Number(limit),
        monthly_price: Number(monthlyPrice) || 0,
        price_per_student: Number(perStudent) || 0,
        is_default: isDefault,
        is_active: isActive,
        sort_order: plan?.sort_order ?? 0,
      },
      { onSuccess: () => navigate('/admin/plans') },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/plans">{t('admin.plans.back')}</BackLink>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{plan ? t('admin.plans.editTitle') : t('admin.plans.add')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('admin.plans.notChargedYet')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan_name">{t('admin.plans.name')}</Label>
              <Input id="plan_name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan_code">{t('admin.plans.code')}</Label>
              <Input
                id="plan_code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono"
                required
              />
              <p className="text-xs text-muted-foreground">{t('admin.plans.codeHelp')}</p>
              {fieldError('code') && <p className="text-sm text-destructive">{fieldError('code')}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan_limit">{t('admin.plans.limit')}</Label>
              <Input
                id="plan_limit"
                type="number"
                min={1}
                inputMode="numeric"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder={t('admin.plans.unlimited')}
              />
              <p className="text-xs text-muted-foreground">{t('admin.plans.limitHelp')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan_monthly">{t('admin.plans.monthlyPrice')}</Label>
                <Input
                  id="plan_monthly"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan_per_student">{t('admin.plans.pricePerStudent')}</Label>
                <Input
                  id="plan_per_student"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={perStudent}
                  onChange={(e) => setPerStudent(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="plan_default"
                checked={isDefault}
                disabled={plan?.is_default}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="plan_default">{t('admin.plans.makeDefault')}</Label>
                <p className="text-xs text-muted-foreground">{t('admin.plans.defaultHelp')}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="plan_active"
                checked={isActive}
                disabled={isDefault}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="plan_active">{t('admin.plans.active')}</Label>
                <p className="text-xs text-muted-foreground">{t('admin.plans.activeHelp')}</p>
              </div>
            </div>

            {save.isError && (
              <p role="alert" className="text-sm text-destructive">
                {serverMessage ?? t('admin.plans.error')}
              </p>
            )}

            <Button type="submit" className="w-fit" disabled={save.isPending || !name.trim() || !code.trim()}>
              {save.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
