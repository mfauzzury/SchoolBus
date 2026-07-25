import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { useMe } from '@/hooks/useAuth'
import { useMyStudentApplications, useMyStudents } from '@/hooks/useParentPortal'
import { calculateGrade } from '@/lib/utils'
import type { Student } from '@/api/parentPortal'

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
  const pendingOrRejected = (applications ?? []).filter((app) => app.status !== 'approved')
  const [detailStudent, setDetailStudent] = useState<Student | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">
        {t('parent.dashboard.welcome', { name: data?.user.name })}
      </h1>

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
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.full_name}</TableCell>
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
                      {student.route && (
                        <Button variant="outline" size="sm" onClick={() => setDetailStudent(student)}>
                          {t('parent.dashboard.details')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t('parent.dashboard.noChildren')}</p>
          )}
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
                {pendingOrRejected.map((application) => (
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
