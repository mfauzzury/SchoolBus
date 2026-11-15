import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/apiError'
import { useEndTransitPlan } from '@/hooks/useOperatorStudents'
import { dateInput } from '@/lib/transit'
import { formatPeriod } from '@/lib/utils'

/** Operator ends a child's transit plan after a last day, e.g. when the parent phones. */
export function EndTransitPlan({ studentId, requestId }: { studentId: number; requestId: number }) {
  const { t, i18n } = useTranslation()
  const end = useEndTransitPlan(studentId)
  const [open, setOpen] = useState(false)
  const [lastDay, setLastDay] = useState(dateInput(0))

  const paidMonths = end.data?.billing.not_changed ?? []
  const message = apiErrorMessage(end.error)

  if (paidMonths.length > 0) {
    return (
      <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        {t('operator.transitRequests.paidBills', {
          months: paidMonths.map((m) => formatPeriod(m, i18n.language)).join(', '),
        })}
      </p>
    )
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-fit" onClick={() => setOpen(true)}>
        {t('transit.plan.end')}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm text-muted-foreground">{t('transit.plan.endHelp')}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`end_${requestId}`}>{t('transit.stop.lastDay')}</Label>
        <Input
          id={`end_${requestId}`}
          type="date"
          className="max-w-48"
          min={dateInput(0)}
          value={lastDay}
          onChange={(e) => setLastDay(e.target.value)}
        />
      </div>
      {end.isError && (
        <p role="alert" className="text-sm text-destructive">
          {message ?? t('operator.transitRequests.error')}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={!lastDay || end.isPending}
          onClick={() => end.mutate({ requestId, endsOn: lastDay })}
        >
          {end.isPending ? t('common.saving') : t('transit.plan.endConfirm')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  )
}
