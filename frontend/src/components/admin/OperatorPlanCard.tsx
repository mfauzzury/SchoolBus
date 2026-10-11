import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAssignOperatorPlan, usePlans } from '@/hooks/useAdmin'
import { useCan } from '@/hooks/useAuth'
import { planUsage } from '@/lib/plans'
import type { AdminOperatorDetail } from '@/api/admin'

/** Which plan the operator is on and how much of it they use; Finance/Owner can move them. */
export function OperatorPlanCard({ operator }: { operator: AdminOperatorDetail }) {
  const { t } = useTranslation()
  const canManage = useCan('plans.manage')
  const { data: plans } = usePlans()
  const assign = useAssignOperatorPlan(operator.id)
  const [choice, setChoice] = useState<string | null>(null)

  const usage = planUsage(operator)
  const selected = choice ?? String(operator.plan?.id ?? '')
  const available = (plans ?? []).filter((p) => p.is_active || p.id === operator.plan?.id)
  const items = Object.fromEntries(available.map((p) => [String(p.id), p.name]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.plans.operatorCardTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-lg font-medium">{operator.plan?.name ?? '—'}</span>
          {usage.over && <Badge variant="destructive">{t('admin.plans.overLimit')}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {usage.limit === null
            ? t('admin.plans.usageUnlimited', { used: usage.used })
            : t('admin.plans.usage', { used: usage.used, limit: usage.limit })}
        </p>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Select items={items} value={selected} onValueChange={(value) => setChoice(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={assign.isPending || selected === '' || selected === String(operator.plan?.id)}
              onClick={() => assign.mutate(Number(selected), { onSuccess: () => setChoice(null) })}
            >
              {t('admin.plans.changePlan')}
            </Button>
            {assign.isError && (
              <span role="alert" className="text-sm text-destructive">
                {t('admin.plans.error')}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
