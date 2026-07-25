import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bus as BusIcon } from 'lucide-react'
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
import { Pagination } from '@/components/ui/pagination'
import { useAdminOperator, useAdminTransactions } from '@/hooks/useAdmin'
import { usePagination } from '@/hooks/usePagination'
import type {
  AdminOperatorBus,
  AdminOperatorRoute,
  AdminOperatorStaff,
  AdminOperatorStudent,
  Transaction,
} from '@/api/admin'
import { cn, formatMoney } from '@/lib/utils'

type TabKey = 'students' | 'buses' | 'staff' | 'routes' | 'transactions'

const busStatusVariant: Record<AdminOperatorBus['status'], 'success' | 'outline' | 'destructive'> = {
  active: 'success',
  maintenance: 'outline',
  retired: 'destructive',
}

const enrollmentVariant: Record<
  AdminOperatorStudent['enrollment_status'],
  'success' | 'outline' | 'destructive'
> = {
  active: 'success',
  suspended: 'outline',
  withdrawn: 'destructive',
}

export function AdminOperatorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const operatorId = Number(id)
  const { data: operator, isLoading } = useAdminOperator(operatorId)
  const [activeTab, setActiveTab] = useState<TabKey>('students')
  const { data: transactions } = useAdminTransactions({ operator_id: operatorId })

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'students', label: t('nav.students'), count: operator?.students_count ?? 0 },
    { key: 'buses', label: t('nav.buses'), count: operator?.buses_count ?? 0 },
    { key: 'staff', label: t('nav.staff'), count: operator?.staff_count ?? 0 },
    { key: 'routes', label: t('nav.routes'), count: operator?.routes_count ?? 0 },
    { key: 'transactions', label: t('admin.nav.transactions'), count: transactions?.length ?? 0 },
  ]

  const listForTab: Record<TabKey, unknown[]> = {
    students: operator?.students ?? [],
    buses: operator?.buses ?? [],
    staff: operator?.staff ?? [],
    routes: operator?.routes ?? [],
    transactions: transactions ?? [],
  }

  const { page, setPage, pageCount, pageItems } = usePagination(listForTab[activeTab])

  useEffect(() => {
    setPage(1)
  }, [activeTab, setPage])

  if (isLoading || !operator) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/admin/operators"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t('admin.operatorDetail.back')}
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {operator.logo_url ? (
              <img src={operator.logo_url} alt="" className="size-12 rounded-md border object-cover" />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                <BusIcon className="size-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-medium">{operator.company_name}</h1>
                <span className="font-mono text-sm text-muted-foreground">{operator.operator_code}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {operator.contact_person} · {operator.contact_phone} · {operator.email}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit capitalize">
            {operator.subscription_plan}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalExpected')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(operator.finance_summary.total_expected)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalCollected')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(operator.finance_summary.total_collected)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalOutstanding')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(operator.finance_summary.total_outstanding)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.overdueCount')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{operator.finance_summary.overdue_count}</CardContent>
        </Card>
      </div>

      <nav
        role="group"
        aria-label="Operator detail section"
        className="inline-flex w-fit items-center rounded-full border p-0.5 text-sm"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'rounded-full px-2.5 py-1 font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {activeTab === 'students' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.students.student')}</TableHead>
                  <TableHead>{t('operator.students.parent')}</TableHead>
                  <TableHead>{t('operator.students.route')}</TableHead>
                  <TableHead>{t('operator.students.package')}</TableHead>
                  <TableHead>{t('operator.students.billing')}</TableHead>
                  <TableHead>{t('operator.students.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pageItems as AdminOperatorStudent[]).map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.full_name}</TableCell>
                    <TableCell>{student.parent_profile?.full_name ?? '—'}</TableCell>
                    <TableCell>{student.route?.name ?? '—'}</TableCell>
                    <TableCell>{t(`common.package.${student.package_type}`)}</TableCell>
                    <TableCell>{t(`common.billingPeriod.${student.billing_period}`)}</TableCell>
                    <TableCell>
                      <Badge variant={enrollmentVariant[student.enrollment_status]}>
                        {t(`common.status.${student.enrollment_status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'buses' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.buses.plateNumber')}</TableHead>
                  <TableHead>{t('operator.buses.capacity')}</TableHead>
                  <TableHead>{t('operator.buses.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pageItems as AdminOperatorBus[]).map((bus) => (
                  <TableRow key={bus.id}>
                    <TableCell>{bus.plate_number}</TableCell>
                    <TableCell>{bus.capacity}</TableCell>
                    <TableCell>
                      <Badge variant={busStatusVariant[bus.status]}>{t(`common.status.${bus.status}`)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'staff' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.staff.name')}</TableHead>
                  <TableHead>{t('operator.staff.role')}</TableHead>
                  <TableHead>{t('operator.staff.phone')}</TableHead>
                  <TableHead>{t('operator.staff.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pageItems as AdminOperatorStaff[]).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.full_name}</TableCell>
                    <TableCell>{t(`operator.staff.${member.role}`)}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'success' : 'outline'}>
                        {t(`common.status.${member.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'routes' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.routes.name')}</TableHead>
                  <TableHead>{t('operator.routes.bus')}</TableHead>
                  <TableHead>{t('operator.routes.driver')}</TableHead>
                  <TableHead>{t('operator.routes.conductor')}</TableHead>
                  <TableHead>{t('operator.routes.stops')}</TableHead>
                  <TableHead>{t('operator.routes.baseFee')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pageItems as AdminOperatorRoute[]).map((route) => (
                  <TableRow key={route.id}>
                    <TableCell>{route.name}</TableCell>
                    <TableCell>{route.bus?.plate_number ?? '—'}</TableCell>
                    <TableCell>{route.driver?.full_name ?? '—'}</TableCell>
                    <TableCell>{route.conductor?.full_name ?? '—'}</TableCell>
                    <TableCell>{route.stops_count}</TableCell>
                    <TableCell>
                      {route.base_monthly_fee ? `RM ${formatMoney(route.base_monthly_fee)}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'transactions' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.transactions.date')}</TableHead>
                  <TableHead>{t('operator.finances.student')}</TableHead>
                  <TableHead>{t('operator.finances.route')}</TableHead>
                  <TableHead>{t('operator.finances.method')}</TableHead>
                  <TableHead>{t('operator.finances.referenceNumber')}</TableHead>
                  <TableHead className="text-right">{t('operator.finances.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pageItems as Transaction[]).map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.payment_date.slice(0, 10)}</TableCell>
                    <TableCell>{txn.invoice.student.full_name}</TableCell>
                    <TableCell>{txn.invoice.route?.name ?? '—'}</TableCell>
                    <TableCell>{t(`operator.finances.${camelizeMethod(txn.method)}`)}</TableCell>
                    <TableCell>{txn.reference_number ?? '—'}</TableCell>
                    <TableCell className="text-right">RM {formatMoney(txn.amount_paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {pageItems.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('admin.operatorDetail.empty')}</p>
          )}

          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}

function camelizeMethod(method: string): string {
  return method === 'bank_transfer' ? 'bankTransfer' : method
}
