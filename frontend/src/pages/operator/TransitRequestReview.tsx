import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackLink } from '@/components/BackLink'
import { CenterPlacement } from '@/components/CenterPlacement'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useRoutes } from '@/hooks/useRoutes'
import { useApproveTransitRequest, useRejectTransitRequest, useTransitRequest } from '@/hooks/useTransitRequests'
import type { Route } from '@/api/routes'
import type { TransitLeg } from '@/api/transitPortal'
import type { OperatorTransitRequestDetail, TransitBillingResult } from '@/api/transitRequests'
import { apiErrorMessage } from '@/lib/apiError'
import { dateInput, showDate, transitStatusVariant } from '@/lib/transit'
import { formatMoney, formatPeriod } from '@/lib/utils'

const HOME_LEGS: TransitLeg[] = ['center_to_home', 'home_to_center']

/**
 * The part of a trip that starts at the center, paired with the part that
 * ends there. A route makes one trip each way a day, so when both are asked
 * for, the second needs a different bus run (e.g. an evening route).
 */
const SECOND_PART: Partial<Record<TransitLeg, TransitLeg>> = {
  center_to_home: 'school_to_center',
  center_to_school: 'home_to_center',
}

interface LegChoice {
  routeId: string
  homeStopId: string
}

/** The stop on this route that looks like the child's home stop (same name), if any. */
function guessHomeStop(route: Route | undefined, request: OperatorTransitRequestDetail): string {
  if (!route) return ''
  const own = request.student.pickup_stop
  if (own && route.stops.some((s) => s.id === own.id)) return String(own.id)
  const sameName = own && route.stops.find((s) => s.name.trim().toLowerCase() === own.name.trim().toLowerCase())
  return sameName ? String(sameName.id) : ''
}

/** After approving: which bills already made got the change, and which were paid and left alone. */
function BillingNotice({ billing }: { billing: TransitBillingResult }) {
  const { t, i18n } = useTranslation()
  const months = (list: string[]) => list.map((m) => formatPeriod(m, i18n.language)).join(', ')

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6 text-sm">
        <p className="font-medium">{t('operator.transitRequests.approvedDone')}</p>
        {billing.added.length > 0 && <p>{t('operator.transitRequests.billedNow', { months: months(billing.added) })}</p>}
        {billing.not_changed.length > 0 && (
          <p className="rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {t('operator.transitRequests.paidBills', { months: months(billing.not_changed) })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function StartDecision({
  request,
  routes,
  onDone,
}: {
  request: OperatorTransitRequestDetail
  routes: Route[]
  onDone: (billing: TransitBillingResult) => void
}) {
  const { t, i18n } = useTranslation()
  const approve = useApproveTransitRequest(request.id)
  const centerId = request.transit_center.id
  const legs = request.legs ?? []
  const childRouteId = request.student.route_id ? String(request.student.route_id) : ''

  const [choices, setChoices] = useState<Record<string, LegChoice>>({})
  // Where the center goes, per route (only for routes it isn't on yet).
  const [placements, setPlacements] = useState<Record<string, number | null>>({})
  const [amount, setAmount] = useState(request.indicative_amount ? String(Number(request.indicative_amount)) : '')
  const askedStart = request.starts_on?.slice(0, 10)
  const startDefault = askedStart && askedStart >= dateInput(0) ? askedStart : dateInput(0)
  const [startsOn, setStartsOn] = useState(startDefault)
  const [billFrom, setBillFrom] = useState<'start_month' | 'next_month'>('start_month')
  const startMonth = startsOn ? `${startsOn.slice(0, 7)}-01` : ''
  const nextMonth = (() => {
    if (!startMonth) return ''
    const [y, m] = startMonth.split('-').map(Number)
    return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  })()

  useEffect(() => {
    const route = routes.find((r) => String(r.id) === childRouteId)
    setChoices(
      Object.fromEntries(
        legs.map((leg) => {
          // The second part can't be the child's own route if that route already does the first part.
          const needsOtherBus = SECOND_PART[leg] !== undefined && legs.includes(SECOND_PART[leg]!)
          return [leg, needsOtherBus ? { routeId: '', homeStopId: '' } : { routeId: childRouteId, homeStopId: guessHomeStop(route, request) }]
        }),
      ),
    )
    if (childRouteId) setPlacements({ [childRouteId]: request.center_after_stop_id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, routes.length])

  const routeById = useMemo(() => new Map(routes.map((r) => [String(r.id), r])), [routes])
  const routeItems = Object.fromEntries(routes.map((r) => [String(r.id), r.name]))

  const setRoute = (leg: TransitLeg, routeId: string) => {
    setChoices((c) => ({ ...c, [leg]: { routeId, homeStopId: guessHomeStop(routeById.get(routeId), request) } }))
    setPlacements((p) => (routeId in p ? p : { ...p, [routeId]: null }))
  }

  /** True when this leg is on the same route as the other part of its trip. */
  const clashes = (leg: TransitLeg) => {
    const first = SECOND_PART[leg]
    return !!first && legs.includes(first) && !!choices[leg]?.routeId && choices[leg]?.routeId === choices[first]?.routeId
  }

  const ready =
    legs.every((leg) => !clashes(leg)) &&
    amount !== '' &&
    Number(amount) >= 0 &&
    !!startsOn &&
    legs.every((leg) => choices[leg]?.routeId && (!HOME_LEGS.includes(leg) || choices[leg]?.homeStopId))

  const onApprove = () => {
    if (!ready) return
    approve.mutate({
      monthly_amount: Number(amount),
      starts_on: startsOn,
      bill_from: billFrom,
      legs: legs.map((leg) => ({
        leg,
        route_id: Number(choices[leg].routeId),
        center_after_stop_id: placements[choices[leg].routeId] ?? null,
        home_stop_id: HOME_LEGS.includes(leg) ? Number(choices[leg].homeStopId) : null,
      })),
    }, { onSuccess: (result) => onDone(result.billing) })
  }

  // The first leg on a route shows where the center goes; later legs on the same route reuse it.
  const placedOn = new Set<string>()

  return (
    <div className="flex flex-col gap-6">
      {legs.map((leg) => {
        const choice = choices[leg]
        const route = choice ? routeById.get(choice.routeId) : undefined
        const centerStop = route?.stops.find((s) => s.transit_center_id === centerId)
        const firstOnRoute = route && !placedOn.has(String(route.id))
        if (route) placedOn.add(String(route.id))

        return (
          <Card key={leg}>
            <CardHeader>
              <CardTitle className="text-base">{t(`transit.legs.${leg}`)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t('operator.transitRequests.whichBus')}</Label>
                <Select items={routeItems} value={choice?.routeId ?? ''} onValueChange={(v) => v && setRoute(leg, v)}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder={t('parent.enroll.selectRoute')} />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clashes(leg) ? (
                  <p className="text-sm text-destructive">{t('operator.transitRequests.sameBusTwice')}</p>
                ) : SECOND_PART[leg] && legs.includes(SECOND_PART[leg]!) && !choice?.routeId ? (
                  <p className="text-xs text-muted-foreground">
                    {t('operator.transitRequests.pickLaterRun', { time: request.leave_center_at ?? '—' })}
                  </p>
                ) : (
                  String(route?.id ?? '') === childRouteId && (
                    <p className="text-xs text-muted-foreground">{t('operator.transitRequests.childsOwnRoute')}</p>
                  )
                )}
              </div>

              {route && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t('operator.transitRequests.centerStop')}</Label>
                  {centerStop ? (
                    <p className="text-sm text-muted-foreground">{t('operator.transitRequests.alreadyAStop')}</p>
                  ) : firstOnRoute ? (
                    <CenterPlacement
                      stops={route.stops}
                      centerName={request.transit_center.name}
                      afterStopId={placements[String(route.id)] ?? null}
                      onChange={(after) => setPlacements((p) => ({ ...p, [String(route.id)]: after }))}
                      endLabel={route.school_destination}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('operator.transitRequests.samePlaceAbove')}</p>
                  )}
                </div>
              )}

              {route && HOME_LEGS.includes(leg) && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t('operator.transitRequests.homeStop')}</Label>
                  <Select
                    items={Object.fromEntries(route.stops.map((s) => [String(s.id), s.name]))}
                    value={choice.homeStopId}
                    onValueChange={(v) => setChoices((c) => ({ ...c, [leg]: { ...c[leg], homeStopId: v ?? '' } }))}
                  >
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder={t('operator.transitRequests.pickHomeStop')} />
                    </SelectTrigger>
                    <SelectContent>
                      {route.stops
                        .filter((s) => s.transit_center_id !== centerId)
                        .map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('operator.transitRequests.priceAndDate')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monthly_amount">{t('operator.transitRequests.monthlyAmount')}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">RM</span>
              <Input
                id="monthly_amount"
                type="number"
                min="0"
                step="0.01"
                className="max-w-36"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {request.indicative_amount
                ? t('operator.transitRequests.centerSaw', { amount: formatMoney(request.indicative_amount) })
                : t('operator.transitRequests.noEstimate')}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tr_starts_on">{t('transit.request.startsOn')}</Label>
            <Input
              id="tr_starts_on"
              type="date"
              className="max-w-48"
              min={dateInput(0)}
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </div>
          {startMonth && (
            <div className="flex flex-col gap-2">
              <Label>{t('operator.transitRequests.firstBill')}</Label>
              <RadioGroup
                className="flex-col items-start gap-2"
                value={billFrom}
                onValueChange={(value) => setBillFrom(value as 'start_month' | 'next_month')}
              >
                <RadioGroupItem value="start_month">
                  {t('operator.transitRequests.billStartMonth', { month: formatPeriod(startMonth, i18n.language) })}
                </RadioGroupItem>
                <RadioGroupItem value="next_month">
                  {t('operator.transitRequests.billNextMonth', { month: formatPeriod(nextMonth, i18n.language) })}
                </RadioGroupItem>
              </RadioGroup>
            </div>
          )}
          {approve.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(approve.error) ?? t('operator.transitRequests.error')}
            </p>
          )}
          <Button className="w-fit" disabled={!ready || approve.isPending} onClick={onApprove}>
            {approve.isPending ? t('common.saving') : t('operator.transitRequests.approve')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function StopDecision({
  request,
  onDone,
}: {
  request: OperatorTransitRequestDetail
  onDone: (billing: TransitBillingResult) => void
}) {
  const { t } = useTranslation()
  const approve = useApproveTransitRequest(request.id)
  const [endsOn, setEndsOn] = useState(request.ends_on?.slice(0, 10) ?? dateInput(0))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.transitRequests.stopTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('operator.transitRequests.stopHelp')}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tr_ends_on">{t('transit.stop.lastDay')}</Label>
          <Input
            id="tr_ends_on"
            type="date"
            className="max-w-48"
            min={dateInput(0)}
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
          />
        </div>
        {approve.isError && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(approve.error) ?? t('operator.transitRequests.error')}
          </p>
        )}
        <Button className="w-fit" disabled={!endsOn || approve.isPending} onClick={() => approve.mutate({ ends_on: endsOn }, { onSuccess: (result) => onDone(result.billing) })}>
          {approve.isPending ? t('common.saving') : t('operator.transitRequests.approveStop')}
        </Button>
      </CardContent>
    </Card>
  )
}

function RejectCard({ requestId }: { requestId: number }) {
  const { t } = useTranslation()
  const reject = useRejectTransitRequest(requestId)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (!open) {
    return (
      <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
        {t('operator.transitRequests.reject')}
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.transitRequests.reject')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Label htmlFor="reject_reason">{t('operator.transitRequests.rejectReason')}</Label>
        <Textarea id="reject_reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="destructive" disabled={!reason.trim() || reject.isPending} onClick={() => reject.mutate(reason.trim())}>
            {reject.isPending ? t('common.saving') : t('operator.transitRequests.reject')}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Review one transit center request: call the parent, choose the buses, set the price. */
export function TransitRequestReview() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isAdmin = useIsOperatorAdmin()
  const { data: request, isLoading } = useTransitRequest(Number(id))
  const { data: routes } = useRoutes()
  const [billing, setBilling] = useState<TransitBillingResult | null>(null)

  if (isLoading || !request) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const parent = request.student.parent_profile
  const pending = request.status === 'pending'

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/operator/applications?tab=transit">{t('operator.applications.title')}</BackLink>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{request.student.full_name}</CardTitle>
              <p className="text-sm text-muted-foreground">{request.student.school_name}</p>
            </div>
            <Badge variant={transitStatusVariant[request.status]}>{t(`transit.status.${request.status}`)}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              <span className="text-muted-foreground">{t('operator.transitRequests.center')}: </span>
              <span className="font-medium">{request.transit_center.name}</span>
              {request.transit_center.phone && <span className="text-muted-foreground"> · {request.transit_center.phone}</span>}
            </p>
            {request.kind === 'stop' ? (
              <p>{t('transit.requests.stopAfter', { date: showDate(request.ends_on) })}</p>
            ) : (
              <>
                <ul className="list-inside list-disc">
                  {(request.legs ?? []).map((leg) => (
                    <li key={leg}>{t(`transit.legs.${leg}`)}</li>
                  ))}
                </ul>
                <p>{t('transit.children.from', { date: showDate(request.starts_on) })}</p>
                {request.leave_center_at && <p>{t('operator.transitRequests.leavesAt', { time: request.leave_center_at })}</p>}
              </>
            )}
            {request.note && <p className="rounded-md bg-muted p-2">“{request.note}”</p>}
            {request.running_plans.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-1 font-medium">{t('operator.transitRequests.currentPlans')}</p>
                {request.running_plans.map((plan) => (
                  <p key={plan.id} className="text-muted-foreground">
                    {plan.transit_center} · {plan.legs.map((leg) => t(`transit.legs.${leg}`)).join(', ')}
                    {plan.monthly_amount && ` · RM ${formatMoney(plan.monthly_amount)}`}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={pending ? 'border-amber-400' : undefined}>
          <CardHeader>
            <CardTitle className="text-base">{t('operator.transitRequests.parent')}</CardTitle>
            {pending && <p className="text-sm text-amber-700 dark:text-amber-300">{t('operator.transitRequests.callParent')}</p>}
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{parent?.full_name ?? '—'}</span>
            {parent?.phone && (
              <a href={`tel:${parent.phone}`} className="flex items-center gap-1.5 text-primary underline-offset-2 hover:underline">
                <Phone className="size-3.5" aria-hidden /> {parent.phone}
              </a>
            )}
            {parent?.email && <span className="text-muted-foreground">{parent.email}</span>}
          </CardContent>
        </Card>
      </div>

      {billing && <BillingNotice billing={billing} />}

      {!pending ? (
        <Card>
          <CardContent className="flex flex-col gap-1 pt-6 text-sm">
            {request.status === 'approved' && request.approved_amount && (
              <p>{t('operator.transitRequests.approvedAt', { amount: formatMoney(request.approved_amount) })}</p>
            )}
            {request.rejection_reason && <p>{t('operator.transitRequests.rejectedBecause', { reason: request.rejection_reason })}</p>}
            {request.reviewer && (
              <p className="text-muted-foreground">
                {t('operator.transitRequests.decidedBy', { name: request.reviewer.name, date: showDate(request.reviewed_at) })}
              </p>
            )}
          </CardContent>
        </Card>
      ) : !isAdmin ? (
        <p className="text-sm text-muted-foreground">{t('operator.transitRequests.adminOnly')}</p>
      ) : (
        <>
          {request.kind === 'stop' ? (
            <StopDecision request={request} onDone={setBilling} />
          ) : (
            <StartDecision request={request} routes={routes ?? []} onDone={setBilling} />
          )}
          <RejectCard requestId={request.id} />
        </>
      )}
    </div>
  )
}
