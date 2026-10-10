import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BusFront, Receipt } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { useMe } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { useMyInvoices, useMyStudentApplications, useMyStudents } from '@/hooks/useParentPortal'
import { useParentTrips } from '@/hooks/useTracking'
import { calculateGrade, cn, formatMoney, invoiceBalance, isInvoiceOverdue } from '@/lib/utils'
import type { Student } from '@/api/parentPortal'
import { FEATURES } from '@/lib/features'

const enrollmentStatusVariant: Record<'active' | 'suspended' | 'withdrawn', 'success' | 'outline' | 'destructive'> = {
  active: 'success',
  suspended: 'outline',
  withdrawn: 'destructive',
}

const applicationStatusVariant: Record<'pending' | 'rejected', 'info' | 'destructive'> = {
  pending: 'info',
  rejected: 'destructive',
}

export function ParentDashboard() {
  const { t, i18n } = useTranslation()
  const { data } = useMe()
  const { data: students, isLoading: studentsLoading } = useMyStudents()
  const { data: applications } = useMyStudentApplications()
  const { data: invoices } = useMyInvoices()
  const { data: trips } = useParentTrips()
  const riders = (trips ?? [])
    .filter((trip) => trip.status === 'active')
    .flatMap((trip) => trip.students.filter((student) => !student.alighted_at))
  const pendingOrRejected = (applications ?? []).filter((app) => app.status !== 'approved')
  const [detailStudent, setDetailStudent] = useState<Student | null>(null)
  const studentsPager = usePagination(students ?? [])
  const applicationsPager = usePagination(pendingOrRejected)

  const unpaidInvoices = (invoices ?? []).filter((inv) => inv.status === 'issued' || inv.status === 'overdue')
  const hasOverdue = unpaidInvoices.some(isInvoiceOverdue)
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + invoiceBalance(inv), 0)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">
        {t('parent.dashboard.welcome', { name: data?.user.name })}
      </h1>

      {FEATURES.parentTrack && riders.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <BusFront className="size-5" />
                <span className="absolute top-0 right-0 size-2.5 rounded-full border-2 border-card bg-green-500" />
              </span>
              <p className="min-w-0 font-medium">
                {t('tracking.dashboardCard.onTheWay', {
                  name: riders.map((student) => student.full_name.split(' ')[0]).join(' & '),
                })}
              </p>
            </div>
            <Link to="/parent/track" className={buttonVariants({ size: 'sm' })}>
              {t('tracking.dashboardCard.track')}
            </Link>
          </CardContent>
        </Card>
      )}

      {unpaidInvoices.length > 0 && (
        <Card
          size="sm"
          className={cn(
            hasOverdue
              ? 'bg-red-50 text-red-950 ring-red-300/70 dark:bg-red-400/10 dark:text-red-100 dark:ring-red-400/30'
              : 'bg-amber-50 text-amber-950 ring-amber-300/70 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/30',
          )}
        >
          <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                hasOverdue
                  ? 'bg-red-200 text-red-900 dark:bg-red-400/20 dark:text-red-200'
                  : 'bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200',
              )}
            >
              <Receipt className="size-5" />
            </span>
            <div className="flex min-w-40 flex-1 flex-col">
              <span
                className={cn(
                  'text-xs',
                  hasOverdue
                    ? 'text-red-900/70 dark:text-red-200/70'
                    : 'text-amber-900/70 dark:text-amber-200/70',
                )}
              >
                {t(hasOverdue ? 'parent.dashboard.reminderOverdueTitle' : 'parent.dashboard.reminderDueTitle')}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-medium">RM {formatMoney(totalOutstanding)}</span>
                <span
                  className={cn(
                    'text-sm',
                    hasOverdue
                      ? 'text-red-900/80 dark:text-red-100/80'
                      : 'text-amber-900/80 dark:text-amber-100/80',
                  )}
                >
                  {t('parent.dashboard.reminderUnpaid')}
                </span>
              </span>
            </div>
            <Link
              to="/parent/invoices/pay"
              className={cn(
                buttonVariants({ size: 'sm' }),
                hasOverdue
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-amber-500 text-amber-950 hover:bg-amber-400',
              )}
            >
              {t('parent.dashboard.payNow')}
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('parent.dashboard.myChildren')}</CardTitle>
          <Link to="/parent/enroll" className={buttonVariants({ size: 'sm' })}>
            {t('parent.dashboard.enrollAChild')}
          </Link>
        </CardHeader>
        <CardContent>
          {studentsLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : students?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('parent.dashboard.name')}</TableHead>
                  <TableHead>{t('parent.dashboard.school')}</TableHead>
                  <TableHead>{t('parent.dashboard.route')}</TableHead>
                  <TableHead>{t('parent.dashboard.package')}</TableHead>
                  <TableHead>{t('parent.dashboard.grade')}</TableHead>
                  <TableHead>{t('parent.dashboard.status')}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsPager.pageItems.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Link
                        to={`/parent/children/${student.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {student.avatar_url ? (
                          <img
                            src={student.avatar_url}
                            alt=""
                            className="size-8 shrink-0 rounded-full border object-cover"
                          />
                        ) : (
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted/50 text-xs text-muted-foreground">
                            {student.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span>{student.full_name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{student.school_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{student.route?.name ?? '—'}</span>
                        {student.route?.driver && (
                          <span className="text-xs text-muted-foreground">
                            {student.route.driver.full_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{t(`common.package.${student.package_type}`)}</TableCell>
                    <TableCell>{calculateGrade(student.date_of_birth, i18n.language)}</TableCell>
                    <TableCell>
                      <Badge variant={enrollmentStatusVariant[student.enrollment_status]}>
                        {t(`common.status.${student.enrollment_status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/parent/children/${student.id}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                        >
                          {t('parent.child.edit')}
                        </Link>
                        {student.route && (
                          <Button variant="outline" size="sm" onClick={() => setDetailStudent(student)}>
                            {t('parent.dashboard.details')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t('parent.dashboard.noChildren')}</p>
          )}
          <Pagination
            page={studentsPager.page}
            pageCount={studentsPager.pageCount}
            onPageChange={studentsPager.setPage}
          />
        </CardContent>
      </Card>

      {data?.tenant && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">{t('parent.dashboard.yourOperator')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('parent.invoice.operator')}</span>
              <span>
                {data.tenant.company_name} · {data.tenant.operator_code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('parent.dashboard.phone')}</span>
              <a
                href={`tel:${data.tenant.contact_phone}`}
                className="underline underline-offset-2 hover:text-primary"
              >
                {data.tenant.contact_phone}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('parent.dashboard.email')}</span>
              <a
                href={`mailto:${data.tenant.email}`}
                className="underline underline-offset-2 hover:text-primary"
              >
                {data.tenant.email}
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingOrRejected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('parent.dashboard.applicationStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('parent.dashboard.name')}</TableHead>
                  <TableHead>{t('parent.dashboard.school')}</TableHead>
                  <TableHead>{t('parent.dashboard.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicationsPager.pageItems.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>{application.full_name}</TableCell>
                    <TableCell>{application.school_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={applicationStatusVariant[application.status as 'pending' | 'rejected']}>
                          {t(`parent.dashboard.application${application.status === 'pending' ? 'Pending' : 'Rejected'}`)}
                        </Badge>
                        {application.status === 'rejected' && application.rejection_reason && (
                          <span className="text-sm text-muted-foreground">
                            {application.rejection_reason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={applicationsPager.page}
              pageCount={applicationsPager.pageCount}
              onPageChange={applicationsPager.setPage}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={detailStudent !== null} onOpenChange={(open) => !open && setDetailStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('parent.dashboard.busDetailsTitle', { name: detailStudent?.full_name })}
            </DialogTitle>
          </DialogHeader>
          {detailStudent?.route && (
            <div className="flex flex-col gap-4 text-sm">
              {detailStudent.route.bus ? (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{t('parent.dashboard.bus')}</span>
                  <span className="text-muted-foreground">
                    {detailStudent.route.bus.plate_number} · {t('parent.dashboard.capacity')}:{' '}
                    {detailStudent.route.bus.capacity}
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground">{t('parent.dashboard.noBusAssigned')}</p>
              )}

              {detailStudent.route.driver && (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{t('parent.dashboard.driver')}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {detailStudent.route.driver.avatar_url ? (
                      <img
                        src={detailStudent.route.driver.avatar_url}
                        alt=""
                        className="size-6 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded-full border bg-muted/50 text-[10px] text-muted-foreground">
                        {detailStudent.route.driver.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>
                      {detailStudent.route.driver.full_name} ·{' '}
                      <a
                        href={`tel:${detailStudent.route.driver.phone}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {detailStudent.route.driver.phone}
                      </a>
                    </span>
                  </div>
                </div>
              )}

              {detailStudent.route.conductor && (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{t('parent.dashboard.conductor')}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {detailStudent.route.conductor.avatar_url ? (
                      <img
                        src={detailStudent.route.conductor.avatar_url}
                        alt=""
                        className="size-6 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded-full border bg-muted/50 text-[10px] text-muted-foreground">
                        {detailStudent.route.conductor.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>
                      {detailStudent.route.conductor.full_name} ·{' '}
                      <a
                        href={`tel:${detailStudent.route.conductor.phone}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {detailStudent.route.conductor.phone}
                      </a>
                    </span>
                  </div>
                </div>
              )}

              {detailStudent.route.stops.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium">{t('parent.dashboard.routeStops')}</span>
                  <ol className="flex flex-col gap-1">
                    {[...detailStudent.route.stops]
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((stop) => {
                        const isPickupStop = stop.id === detailStudent.pickup_stop_id
                        return (
                          <li
                            key={stop.id}
                            className={
                              isPickupStop
                                ? 'flex items-center gap-2 font-medium text-foreground'
                                : 'flex items-center gap-2 text-muted-foreground'
                            }
                          >
                            <span>{stop.sequence}.</span>
                            <span>{stop.name}</span>
                            {isPickupStop && (
                              <Badge variant="info">{t('parent.dashboard.pickupStopLabel')}</Badge>
                            )}
                          </li>
                        )
                      })}
                  </ol>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
