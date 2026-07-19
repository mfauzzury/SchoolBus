import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Pagination } from '@/components/ui/pagination'
import { useRoutes } from '@/hooks/useRoutes'
import { useOperatorStudents } from '@/hooks/useOperatorStudents'
import { usePagination } from '@/hooks/usePagination'
import type { OperatorStudent } from '@/api/operatorStudents'
import { formatMoney } from '@/lib/utils'

const ALL = 'all'

const enrollmentVariant: Record<OperatorStudent['enrollment_status'], 'success' | 'outline' | 'destructive'> = {
  active: 'success',
  suspended: 'outline',
  withdrawn: 'destructive',
}

const invoiceVariant: Record<string, 'success' | 'info' | 'outline' | 'destructive'> = {
  draft: 'outline',
  issued: 'info',
  paid: 'success',
  overdue: 'destructive',
}

export function Students() {
  const { t } = useTranslation()
  const { data: routes } = useRoutes()
  const [routeId, setRouteId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [search, setSearch] = useState('')

  const { data: students, isLoading } = useOperatorStudents({
    route_id: routeId !== ALL ? Number(routeId) : undefined,
    status: status !== ALL ? status : undefined,
  })

  const query = search.trim().toLowerCase()
  const filteredStudents = (students ?? []).filter((student) => {
    if (!query) return true
    return (
      student.full_name.toLowerCase().includes(query) ||
      student.school_name.toLowerCase().includes(query) ||
      (student.parent_profile?.full_name.toLowerCase().includes(query) ?? false)
    )
  })

  const { page, setPage, pageCount, pageItems: pagedStudents } = usePagination(filteredStudents)

  useEffect(() => {
    setPage(1)
  }, [routeId, status, search, setPage])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('operator.students.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="search">{t('common.search')}</Label>
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('operator.students.searchPlaceholder')}
                className="w-64"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.students.route')}</Label>
              <Select
                items={{ [ALL]: t('common.allRoutes'), ...Object.fromEntries((routes ?? []).map((r) => [String(r.id), r.name])) }}
                value={routeId}
                onValueChange={(v) => setRouteId(v ?? ALL)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.allRoutes')}</SelectItem>
                  {routes?.map((route) => (
                    <SelectItem key={route.id} value={String(route.id)}>
                      {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.students.status')}</Label>
              <Select
                items={{
                  [ALL]: t('common.allStatuses'),
                  active: t('common.status.active'),
                  suspended: t('common.status.suspended'),
                  withdrawn: t('common.status.withdrawn'),
                }}
                value={status}
                onValueChange={(v) => setStatus(v ?? ALL)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('common.status.active')}</SelectItem>
                  <SelectItem value="suspended">{t('common.status.suspended')}</SelectItem>
                  <SelectItem value="withdrawn">{t('common.status.withdrawn')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : !students?.length ? (
            <p className="text-sm text-muted-foreground">{t('operator.students.noStudents')}</p>
          ) : filteredStudents.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.students.student')}</TableHead>
                  <TableHead>{t('operator.students.parent')}</TableHead>
                  <TableHead>{t('operator.students.route')}</TableHead>
                  <TableHead>{t('operator.students.package')}</TableHead>
                  <TableHead>{t('operator.students.billing')}</TableHead>
                  <TableHead>{t('operator.students.status')}</TableHead>
                  <TableHead>{t('operator.students.latestInvoice')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStudents.map((student) => {
                  const latestInvoice = student.invoices[0]
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{student.full_name}</span>
                          <span className="text-xs text-muted-foreground">{student.school_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{student.parent_profile?.full_name ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {student.parent_profile?.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{student.route?.name ?? '—'}</TableCell>
                      <TableCell>{t(`common.package.${student.package_type}`)}</TableCell>
                      <TableCell>{t(`common.billingPeriod.${student.billing_period}`)}</TableCell>
                      <TableCell>
                        <Badge variant={enrollmentVariant[student.enrollment_status]}>
                          {t(`common.status.${student.enrollment_status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {latestInvoice ? (
                          <Badge variant={invoiceVariant[latestInvoice.status]}>
                            {t(`operator.finances.${latestInvoice.status}`)} — RM{' '}
                            {formatMoney(latestInvoice.final_amount)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t('operator.students.noResults')}</p>
          )}
          {filteredStudents.length ? (
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
