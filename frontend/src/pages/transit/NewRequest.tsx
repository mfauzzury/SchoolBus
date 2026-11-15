import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CenterPlacement } from '@/components/CenterPlacement'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useCreateTransitRequest,
  useMyCenter,
  useTransitStudent,
  useTransitStudentSearch,
} from '@/hooks/useTransitPortal'
import type { TransitLeg, TransitStudentSummary } from '@/api/transitPortal'
import { apiErrorMessage } from '@/lib/apiError'
import { AFTER_SCHOOL_LEGS, BEFORE_SCHOOL_LEGS, LEAVES_CENTER_LEGS, dateInput } from '@/lib/transit'
import { cn, formatMoney } from '@/lib/utils'

function ChildLine({ child }: { child: TransitStudentSummary }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col">
      <span className="font-medium">{child.full_name}</span>
      <span className="text-xs text-muted-foreground">
        {[child.school_name, child.class_name].filter(Boolean).join(' · ')}
      </span>
      <span className="text-xs text-muted-foreground">
        {t('transit.request.parentLine', { name: child.parent_name ?? '—', phone: child.parent_phone_end ?? '----' })}
      </span>
    </div>
  )
}

/** Step 1: find the child by name or the parent's phone. */
function FindChild({ onPick }: { onPick: (id: number) => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const { data: results, isFetching } = useTransitStudentSearch(useDebouncedValue(q))

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t('transit.request.findTitle')}</CardTitle>
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
                <ChildLine child={child} />
                {child.status_here === 'pending' ? (
                  <Badge variant="info">{t('transit.status.pending')}</Badge>
                ) : (
                  <Button size="sm" onClick={() => onPick(child.id)}>
                    {t('transit.request.choose')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/** Step 2: what the bus should do, where the center is on the route, and from when. */
function RequestForm({ studentId, onBack }: { studentId: number; onBack: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: center } = useMyCenter()
  const { data: child, isLoading } = useTransitStudent(studentId)
  const create = useCreateTransitRequest()

  const [legs, setLegs] = useState<TransitLeg[]>(['school_to_center', 'center_to_home'])
  const [afterStopId, setAfterStopId] = useState<number | null>(null)
  const [startsOn, setStartsOn] = useState(dateInput(1))
  const [leaveAt, setLeaveAt] = useState('')
  const [note, setNote] = useState('')

  const existingCenterStop = child?.route?.stops.find((s) => s.is_this_center)
  const otherStops = useMemo(() => child?.route?.stops.filter((s) => !s.is_this_center) ?? [], [child])

  // The center usually sits near the school: start it after the last stop.
  useEffect(() => {
    if (!child?.route) return
    const stops = child.route.stops
    if (existingCenterStop) {
      const index = stops.findIndex((s) => s.id === existingCenterStop.id)
      setAfterStopId(index > 0 ? stops[index - 1].id : null)
    } else {
      setAfterStopId(stops.length ? stops[stops.length - 1].id : null)
    }
  }, [child, existingCenterStop])

  if (isLoading || !child || !center) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  // One price per center, whichever parts of the day the bus covers.
  const price = center.monthly_price
  const needsLeaveTime = legs.some((leg) => LEAVES_CENTER_LEGS.includes(leg))
  const apiMessage = apiErrorMessage(create.error)

  const toggle = (leg: TransitLeg, on: boolean) =>
    setLegs((current) => (on ? [...current, leg] : current.filter((l) => l !== leg)))

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate(
      {
        student_id: child.id,
        legs,
        center_after_stop_id: child.route ? afterStopId : null,
        starts_on: startsOn,
        leave_center_at: needsLeaveTime && leaveAt ? leaveAt : null,
        note: note.trim() || null,
      },
      { onSuccess: () => navigate('/transit/requests') },
    )
  }

  const legGroup = (title: string, group: TransitLeg[]) => (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      {group.map((leg) => (
        <label key={leg} className="flex items-center gap-2 rounded-md border p-3 text-sm">
          <Checkbox checked={legs.includes(leg)} onCheckedChange={(on) => toggle(leg, on)} />
          {t(`transit.legs.${leg}`)}
        </label>
      ))}
    </div>
  )

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <ChildLine child={child} />
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            {t('transit.request.changeChild')}
          </Button>
        </CardHeader>
        {child.status_here === 'active' && (
          <CardContent>
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {t('transit.request.replacesPlan')}
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('transit.request.whatTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {legGroup(t('transit.request.afterSchool'), AFTER_SCHOOL_LEGS)}
          {legGroup(t('transit.request.beforeSchool'), BEFORE_SCHOOL_LEGS)}
          {legs.length === 0 && <p className="text-sm text-destructive">{t('transit.request.pickOne')}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('transit.request.whereTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {child.route
              ? existingCenterStop
                ? t('transit.request.alreadyOnRoute', { route: child.route.name })
                : t('transit.request.whereHelp', { route: child.route.name })
              : t('transit.request.noRoute')}
          </p>
        </CardHeader>
        {child.route && (
          <CardContent>
            <CenterPlacement
              stops={otherStops}
              centerName={center.name}
              afterStopId={afterStopId}
              onChange={setAfterStopId}
              endLabel={child.route.school_destination || child.school_name}
              disabled={Boolean(existingCenterStop)}
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('transit.request.whenTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="starts_on">{t('transit.request.startsOn')}</Label>
            <Input
              id="starts_on"
              type="date"
              className="max-w-48"
              min={dateInput(0)}
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              required
            />
          </div>
          {needsLeaveTime && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave_at">{t('transit.request.leaveAt')}</Label>
              <Input
                id="leave_at"
                type="time"
                className="max-w-36"
                value={leaveAt}
                onChange={(e) => setLeaveAt(e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">{t('transit.request.note')}</Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm">{t('transit.request.estimate')}</span>
            <span className="text-xl font-semibold">
              {price === null || legs.length === 0
                ? t('transit.portal.askOperator')
                : `RM ${formatMoney(price)} / ${t('transit.portal.month')}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{t('transit.request.estimateHint')}</p>
          {create.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiMessage ?? t('transit.request.error')}
            </p>
          )}
          <Button type="submit" disabled={create.isPending || legs.length === 0 || !startsOn} className="w-fit">
            {create.isPending ? t('common.saving') : t('transit.request.send')}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}

/** Ask the bus operator to carry a child to and from the center. */
export function TransitNewRequest() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const studentId = params.get('student') ? Number(params.get('student')) : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('transit.request.title')}</h1>
        <Link to="/transit/requests" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          {t('transit.portal.requests')}
        </Link>
      </div>
      {studentId ? (
        <RequestForm studentId={studentId} onBack={() => setParams({})} />
      ) : (
        <FindChild onPick={(id) => setParams({ student: String(id) })} />
      )}
    </div>
  )
}
