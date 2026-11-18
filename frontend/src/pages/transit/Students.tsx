import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useCancelTransitRequest,
  useCreateTransitRequest,
  useMyCenter,
  useMyTransitRequests,
  useTransitChildren,
  useTransitStudentSearch,
} from '@/hooks/useTransitPortal'
import type { TransitStudentSummary } from '@/api/transitPortal'
import { apiErrorMessage } from '@/lib/apiError'
import { transitStatusVariant } from '@/lib/transit'
import { cn, formatMoney } from '@/lib/utils'

function StudentLine({
  student,
}: {
  student: Pick<TransitStudentSummary, 'full_name' | 'school_name' | 'class_name'>
}) {
  return (
    <div className="flex flex-col">
      <span className="font-medium">{student.full_name}</span>
      <span className="text-xs text-muted-foreground">
        {[student.school_name, student.class_name].filter(Boolean).join(' · ')}
      </span>
    </div>
  )
}

/** Where the applicant is in the wizard: a done step shows a tick, the current one is filled. */
function Stepper({ current, steps }: { current: number; steps: string[] }) {
  return (
    <ol className="flex max-w-2xl items-center" aria-label={steps.join(' → ')}>
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li
            key={label}
            className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium',
                (done || active) && 'border-primary bg-primary text-primary-foreground',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn('ml-2 text-sm', active ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
            {i < steps.length - 1 && (
              <span className={cn('mx-3 h-px flex-1', done ? 'bg-primary' : 'bg-border')} aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Apply for a bus in two steps: find the student, then send the application. */
function ApplyWizard({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<TransitStudentSummary | null>(null)
  const { data: results, isFetching } = useTransitStudentSearch(useDebouncedValue(q))
  const create = useCreateTransitRequest()
  const { data: center } = useMyCenter()

  const steps = [t('transit.students.stepSearch'), t('transit.students.stepApply')]

  if (picked) {
    return (
      <>
        <Stepper current={1} steps={steps} />
        <Card className="max-w-2xl">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 rounded-md border p-3">
              <StudentLine student={picked} />
              <span className="text-xs text-muted-foreground">
                {t('transit.request.parentLine', {
                  name: picked.parent_name ?? '—',
                  phone: picked.parent_phone_end ?? '----',
                })}
              </span>
            </div>
            {center?.monthly_price != null && (
            <div className="flex flex-col gap-1 rounded-md bg-muted p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">{t('transit.students.priceLabel')}</span>
                <span className="text-lg font-semibold">
                  RM {formatMoney(center.monthly_price)} / {t('transit.portal.month')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t('transit.students.priceNote')}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{t('transit.students.applyHelp')}</p>
            {create.isError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(create.error) ?? t('transit.request.error')}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPicked(null)} disabled={create.isPending}>
                {t('transit.students.back')}
              </Button>
              <Button
                disabled={create.isPending}
                onClick={() => create.mutate({ student_id: picked.id }, { onSuccess: onSent })}
              >
                {create.isPending ? t('transit.students.applying') : t('transit.students.applyNow')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <Stepper current={0} steps={steps} />
      <Card className="max-w-2xl">
        <CardHeader>
          <p className="text-sm text-muted-foreground">{t('transit.request.findHelp')}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              className="pl-8"
              placeholder={t('transit.request.findPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {q.trim().length < 3 ? (
            <p className="text-sm text-muted-foreground">{t('transit.request.typeMore')}</p>
          ) : isFetching && !results ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : !results?.length ? (
            <p className="text-sm text-muted-foreground">{t('transit.request.noneFound')}</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-md border">
              {results.map((child) => (
                <li key={child.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex flex-col">
                    <StudentLine student={child} />
                    <span className="text-xs text-muted-foreground">
                      {t('transit.request.parentLine', {
                        name: child.parent_name ?? '—',
                        phone: child.parent_phone_end ?? '----',
                      })}
                    </span>
                  </div>
                  {child.status_here ? (
                    <Badge variant={child.status_here === 'pending' ? 'info' : 'success'}>
                      {t('transit.students.alreadyApplied')}
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => setPicked(child)}>
                      {t('transit.students.applyNow')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" className="w-fit" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </CardContent>
      </Card>
    </>
  )
}

/** The center's students: the ones on the bus, the ones waiting for the operator, and the way to apply for more. */
export function TransitStudents() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [justSent, setJustSent] = useState(false)
  const { data: children, isLoading } = useTransitChildren()
  const { data: requests } = useMyTransitRequests()
  const cancel = useCancelTransitRequest()

  const applying = params.has('apply')
  const startRequests = (requests ?? []).filter((r) => r.kind === 'start')
  const onBusIds = new Set((children ?? []).map((c) => c.student.id))
  const waiting = startRequests.filter((r) => r.status === 'pending')
  const waitingIds = new Set(waiting.map((r) => r.student.id))
  // Only the latest "not approved" per child, and only while nothing else is going on for them.
  const rejected = startRequests.filter(
    (r, i) =>
      r.status === 'rejected' &&
      !onBusIds.has(r.student.id) &&
      !waitingIds.has(r.student.id) &&
      startRequests.findIndex((x) => x.student.id === r.student.id) === i,
  )

  if (applying) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">{t('transit.students.apply')}</h1>
        <ApplyWizard
          onClose={() => setParams({})}
          onSent={() => {
            setJustSent(true)
            setParams({})
          }}
        />
      </div>
    )
  }

  const empty = !isLoading && !children?.length && !waiting.length && !rejected.length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('transit.students.title')}</CardTitle>
        <Button
          onClick={() => {
            setJustSent(false)
            setParams({ apply: '1' })
          }}
        >
          {t('transit.students.apply')}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {justSent && (
          <p
            role="status"
            className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {t('transit.students.sent')}
          </p>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : empty ? (
          <p className="text-sm text-muted-foreground">{t('transit.students.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('transit.children.child')}</TableHead>
                <TableHead>{t('transit.requests.status')}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {waiting.map((r) => (
                <TableRow key={`w${r.id}`}>
                  <TableCell>
                    <StudentLine student={{ ...r.student, class_name: null }} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={transitStatusVariant.pending}>{t('transit.students.waiting')}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(r.id)}>
                      {t('common.cancel')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rejected.map((r) => (
                <TableRow key={`r${r.id}`}>
                  <TableCell>
                    <StudentLine student={{ ...r.student, class_name: null }} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={transitStatusVariant.rejected}>{t('transit.status.rejected')}</Badge>
                    {r.rejection_reason && (
                      <span className="mt-1 block text-xs text-muted-foreground">{r.rejection_reason}</span>
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
              {(children ?? []).map((child) => (
                <TableRow key={`c${child.request_id}`}>
                  <TableCell>
                    <StudentLine student={child.student} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">{t('transit.students.active')}</Badge>
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
