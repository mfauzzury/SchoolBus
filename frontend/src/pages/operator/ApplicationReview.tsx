import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useApproveStudentApplication,
  useRejectStudentApplication,
  useStudentApplication,
} from '@/hooks/useStudentApplications'
import { useRoutes } from '@/hooks/useRoutes'
import { formatMoney } from '@/lib/utils'
import { routeFeeFor } from '@/lib/billing'
import type { OperatorStudentApplication } from '@/api/studentApplications'

const NO_STOP = 'none'

// Bills cover whole calendar months, so the operator decides what a child
// joining part-way through pays for the month they join.
type FirstBill = 'full' | 'custom' | 'next_month'

const statusVariant: Record<OperatorStudentApplication['status'], 'success' | 'info' | 'destructive'> = {
  pending: 'info',
  approved: 'success',
  rejected: 'destructive',
}

export function ApplicationReview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const applicationId = Number(id)

  const { data: application, isLoading } = useStudentApplication(applicationId)
  const { data: routes } = useRoutes()
  const approve = useApproveStudentApplication(applicationId)
  const reject = useRejectStudentApplication(applicationId)

  const [routeId, setRouteId] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [feeOverride, setFeeOverride] = useState('')
  const [pickupStopId, setPickupStopId] = useState(NO_STOP)
  const [firstBill, setFirstBill] = useState<FirstBill>('full')
  const [firstMonthAmount, setFirstMonthAmount] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const selectedRoute = routes?.find((r) => String(r.id) === routeId)

  if (isLoading || !application) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const school = schoolName || application.school_name

  // The route's price for this child's package; one-way falls back to the return fee.
  const routeFee = routeFeeFor(selectedRoute, application.package_type)
  const monthlyFee = feeOverride || routeFee
  const firstBillLabels: Record<FirstBill, string> = {
    full: t('operator.applications.firstBillFull'),
    custom: t('operator.applications.firstBillCustom'),
    next_month: t('operator.applications.firstBillNextMonth'),
  }
  const canApprove =
    !!routeId && !!monthlyFee && (firstBill !== 'custom' || firstMonthAmount !== '')

  const onApprove = () => {
    if (!canApprove) return
    approve.mutate(
      {
        route_id: Number(routeId),
        school_name: school,
        fee_override: feeOverride ? Number(feeOverride) : null,
        pickup_stop_id: pickupStopId === NO_STOP ? null : Number(pickupStopId),
        billing_start: firstBill === 'next_month' ? 'next_month' : 'this_month',
        first_month_amount: firstBill === 'custom' ? Number(firstMonthAmount) : null,
      },
      { onSuccess: () => navigate('/operator/applications') },
    )
  }

  const onReject = () => {
    if (!rejectionReason.trim()) return
    reject.mutate(
      { rejection_reason: rejectionReason },
      { onSuccess: () => navigate('/operator/applications') },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{application.full_name}</CardTitle>
          <Badge variant={statusVariant[application.status]}>
            {t(`operator.applications.status${application.status.charAt(0).toUpperCase()}${application.status.slice(1)}`)}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('parent.enroll.dateOfBirth')}</span>
            <span>{application.date_of_birth.slice(0, 10)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('operator.applications.requestedSchool')}</span>
            <span>{application.school_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('operator.students.package')}</span>
            <span>{t(`common.package.${application.package_type}`)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('operator.applications.parent')}</span>
            <span>{application.parent_profile?.full_name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{application.parent_profile?.phone}</span>
            <span>{application.parent_profile?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('operator.applications.submitted')}</span>
            <span>{application.created_at.slice(0, 10)}</span>
          </div>
        </CardContent>
      </Card>

      {application.status === 'pending' ? (
        <>
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>{t('operator.applications.approve')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t('operator.applications.route')}</Label>
                <Select
                  items={Object.fromEntries((routes ?? []).map((r) => [String(r.id), r.name]))}
                  value={routeId}
                  onValueChange={(v) => setRouteId(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('parent.enroll.selectRoute')} />
                  </SelectTrigger>
                  <SelectContent>
                    {routes?.map((route) => (
                      <SelectItem key={route.id} value={String(route.id)}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRoute && selectedRoute.stops.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t('operator.applications.pickupStop')}</Label>
                  <Select
                    items={{
                      [NO_STOP]: t('parent.enroll.unspecified'),
                      ...Object.fromEntries(selectedRoute.stops.map((s) => [String(s.id), s.name])),
                    }}
                    value={pickupStopId}
                    onValueChange={(v) => setPickupStopId(v ?? NO_STOP)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_STOP}>{t('parent.enroll.unspecified')}</SelectItem>
                      {[...selectedRoute.stops]
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((stop) => (
                          <SelectItem key={stop.id} value={String(stop.id)}>
                            {stop.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="school_name">{t('operator.applications.schoolName')}</Label>
                <Input
                  id="school_name"
                  value={school}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fee_override">{t('operator.applications.feeOverride')}</Label>
                <Input
                  id="fee_override"
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeOverride}
                  onChange={(e) => setFeeOverride(e.target.value)}
                  placeholder={routeFee ? `RM ${formatMoney(routeFee)}` : undefined}
                />
                <p className="text-xs text-muted-foreground">{t('operator.applications.feeOverrideHint')}</p>
                {routeId && !monthlyFee && (
                  <p className="text-sm text-destructive">{t('operator.applications.noRouteFee')}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t('operator.applications.firstBill')}</Label>
                <Select
                  items={firstBillLabels}
                  value={firstBill}
                  onValueChange={(v) => setFirstBill((v as FirstBill) ?? 'full')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(firstBillLabels) as FirstBill[]).map((option) => (
                      <SelectItem key={option} value={option}>
                        {firstBillLabels[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('operator.applications.firstBillHint')}</p>
              </div>

              {firstBill === 'custom' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="first_month_amount">{t('operator.applications.firstMonthAmount')}</Label>
                  <Input
                    id="first_month_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={firstMonthAmount}
                    onChange={(e) => setFirstMonthAmount(e.target.value)}
                    placeholder={monthlyFee ? `RM ${formatMoney(monthlyFee)}` : undefined}
                  />
                </div>
              )}

              {monthlyFee && (
                <div className="flex justify-between rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">{t('operator.applications.monthlyFee')}</span>
                  <span className="font-medium">RM {formatMoney(monthlyFee)}</span>
                </div>
              )}

              {approve.isError && (
                <p className="text-sm text-destructive">{t('operator.applications.submitError')}</p>
              )}

              <Button onClick={onApprove} disabled={!canApprove || approve.isPending}>
                {approve.isPending ? t('common.loading') : t('operator.applications.approve')}
              </Button>
            </CardContent>
          </Card>

          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>{t('operator.applications.reject')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {rejecting ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rejection_reason">{t('operator.applications.rejectionReason')}</Label>
                    <Textarea
                      id="rejection_reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t('operator.applications.rejectionReasonPlaceholder')}
                    />
                    {!rejectionReason.trim() && (
                      <p className="text-sm text-destructive">
                        {t('operator.applications.rejectionReasonRequired')}
                      </p>
                    )}
                  </div>
                  {reject.isError && (
                    <p className="text-sm text-destructive">{t('operator.applications.submitError')}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={onReject}
                      disabled={!rejectionReason.trim() || reject.isPending}
                    >
                      {reject.isPending ? t('common.loading') : t('operator.applications.confirmReject')}
                    </Button>
                    <Button variant="outline" onClick={() => setRejecting(false)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </>
              ) : (
                <Button variant="destructive" onClick={() => setRejecting(true)}>
                  {t('operator.applications.reject')}
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>{t('operator.applications.reviewResult')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {application.status === 'approved' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('operator.applications.resultingRoute')}</span>
                  <span>{application.route?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('operator.applications.feeOverride')}</span>
                  <span>{application.fee_override ? `RM ${formatMoney(application.fee_override)}` : '—'}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">{t('operator.applications.rejectionReason')}</span>
                <span>{application.rejection_reason}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('operator.applications.reviewedOn')}</span>
              <span>{application.reviewed_at?.slice(0, 10) ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
