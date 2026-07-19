import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { useStudentApplications } from '@/hooks/useStudentApplications'
import { usePagination } from '@/hooks/usePagination'
import type { OperatorStudentApplication } from '@/api/studentApplications'
import { cn } from '@/lib/utils'

const ALL = 'all'

const statusVariant: Record<OperatorStudentApplication['status'], 'success' | 'info' | 'destructive'> = {
  pending: 'info',
  approved: 'success',
  rejected: 'destructive',
}

export function Applications() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('pending')

  const { data: applications, isLoading } = useStudentApplications({
    status: status !== ALL ? status : undefined,
  })

  const { page, setPage, pageCount, pageItems: pagedApplications } = usePagination(applications ?? [])

  useEffect(() => {
    setPage(1)
  }, [status, setPage])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('operator.applications.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.applications.status')}</Label>
              <Select
                items={{
                  [ALL]: t('common.allStatuses'),
                  pending: t('operator.applications.statusPending'),
                  approved: t('operator.applications.statusApproved'),
                  rejected: t('operator.applications.statusRejected'),
                }}
                value={status}
                onValueChange={(v) => setStatus(v ?? ALL)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('operator.applications.statusPending')}</SelectItem>
                  <SelectItem value="approved">{t('operator.applications.statusApproved')}</SelectItem>
                  <SelectItem value="rejected">{t('operator.applications.statusRejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : !applications?.length ? (
            <p className="text-sm text-muted-foreground">{t('operator.applications.noApplications')}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('operator.applications.student')}</TableHead>
                    <TableHead>{t('operator.applications.parent')}</TableHead>
                    <TableHead>{t('operator.applications.package')}</TableHead>
                    <TableHead>{t('operator.applications.submitted')}</TableHead>
                    <TableHead>{t('operator.applications.status')}</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{application.full_name}</span>
                          <span className="text-xs text-muted-foreground">{application.school_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{application.parent_profile?.full_name ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {application.parent_profile?.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{t(`common.package.${application.package_type}`)}</span>
                          <span className="text-xs text-muted-foreground">
                            {t(`common.billingPeriod.${application.billing_period}`)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{application.created_at.slice(0, 10)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[application.status]}>
                          {t(`operator.applications.status${application.status.charAt(0).toUpperCase()}${application.status.slice(1)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/operator/applications/${application.id}`}
                          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                        >
                          {t('operator.applications.review')}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
