import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { MonthPicker } from '@/components/MonthPicker'
import { TabBar } from '@/components/TabBar'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useBillingConfig } from '@/hooks/useBillingConfig'
import { useCreateInvoice, useInvoices } from '@/hooks/useFinances'
import { useOperatorStudent, useUpdateOperatorStudent } from '@/hooks/useOperatorStudents'
import { usePagination } from '@/hooks/usePagination'
import type { OperatorStudentDetail } from '@/api/operatorStudents'
import { receiptUrl, type LedgerInvoice } from '@/api/finances'
import { calculateGrade, cn, formatMoney, formatPeriod, isInvoiceOverdue } from '@/lib/utils'
import { routeFeeFor } from '@/lib/billing'
import { BackLink } from '@/components/BackLink'

type EnrollmentStatus = OperatorStudentDetail['enrollment_status']

type Tab = 'details' | 'bills' | 'transactions'
const TAB_VALUES: Tab[] = ['details', 'bills', 'transactions']

const STATUSES: EnrollmentStatus[] = ['active', 'suspended', 'withdrawn']

const enrollmentVariant: Record<EnrollmentStatus, 'success' | 'outline' | 'destructive'> = {
  active: 'success',
  suspended: 'outline',
  withdrawn: 'destructive',
}

const invoiceVariant: Record<string, 'success' | 'info' | 'outline' | 'destructive'> = {
  draft: 'outline',
  issued: 'info',
  paid: 'success',
  overdue: 'destructive',
  void: 'outline',
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function monthLabel(month: number, language: string): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
    month: 'long',
  })
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

/** "2026-11-01T00:00:00Z" -> "2026-11", the value a month picker works with. */
const toMonthValue = (date: string | null) => (date ? date.slice(0, 7) : '')

/**
 * The child's recurring bill, in one place: what the next automatic bill will
 * be, then the few things the operator can change — the monthly fee, when
 * billing starts and stops, and whether the child is billed at all.
 */
function RecurringBill({ student }: { student: OperatorStudentDetail }) {
  const { t, i18n } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const update = useUpdateOperatorStudent()
  const { data: billingConfig } = useBillingConfig()

  const saved = {
    fee: student.fee_override ? String(Number(student.fee_override)) : '',
    start: toMonthValue(student.billing_starts_on),
    end: toMonthValue(student.billing_ends_on),
    status: student.enrollment_status,
  }
  const [fee, setFee] = useState(saved.fee)
  const [start, setStart] = useState(saved.start)
  const [end, setEnd] = useState(saved.end)
  const [status, setStatus] = useState<EnrollmentStatus>(saved.status)

  // Follow the saved record (after saving, or when moving between siblings).
  useEffect(() => {
    setFee(saved.fee)
    setStart(saved.start)
    setEnd(saved.end)
    setStatus(saved.status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, saved.fee, saved.start, saved.end, saved.status])

  const routeFee = routeFeeFor(student.route, student.package_type)
  const monthlyFee = student.fee_override ?? routeFee
  const statusLabels = Object.fromEntries(STATUSES.map((s) => [s, t(`common.status.${s}`)]))
  const dirty = fee !== saved.fee || start !== saved.start || end !== saved.end || status !== saved.status
  const endBeforeStart = start !== '' && end !== '' && end < start
  const next = student.next_bill

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (endBeforeStart) return
    update.mutate({
      id: student.id,
      input: {
        fee_override: fee === '' ? null : Number(fee),
        enrollment_status: status,
        billing_starts_on: start || null,
        billing_ends_on: end || null,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.students.billingSettings')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">{t('operator.students.nextBill')}</p>
          {'month' in next ? (
            <>
              <p className="text-lg font-medium">
                {formatPeriod(next.month, i18n.language)} · RM {formatMoney(next.amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('operator.students.nextBillDue', { date: next.due_date })}
                {next.sibling_discount_rate > 0 &&
                  ` · ${t('operator.students.afterSiblingDiscount', { rate: next.sibling_discount_rate })}`}
              </p>
            </>
          ) : (
            <p className="text-sm">
              {t(`operator.students.noBill.${next.reason}`, {
                month: 'ended_on' in next ? formatPeriod(next.ended_on, i18n.language) : '',
              })}
            </p>
          )}
        </div>

        {isAdmin ? (
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student_fee">{t('operator.students.customFee')}</Label>
              <Input
                id="student_fee"
                type="number"
                min="0"
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder={routeFee ? `RM ${formatMoney(routeFee)}` : undefined}
              />
              <p className="text-xs text-muted-foreground">{t('operator.students.customFeeHint')}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.students.startFrom')}</Label>
              <MonthPicker value={start} onChange={setStart} label={t('operator.students.startFrom')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.students.stopAfter')}</Label>
              <MonthPicker value={end} onChange={setEnd} label={t('operator.students.stopAfter')} />
              <p className="text-xs text-muted-foreground">{t('operator.students.windowHint')}</p>
              {endBeforeStart && (
                <p className="text-sm text-destructive">{t('operator.students.stopBeforeStartError')}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.students.status')}</Label>
              <Select
                items={statusLabels}
                value={status}
                onValueChange={(v) => v && setStatus(v as EnrollmentStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('operator.students.statusHint')}</p>
            </div>

            {update.isError && <p className="text-sm text-destructive">{t('operator.settings.saveError')}</p>}
            {update.isSuccess && !dirty && <p className="text-sm text-muted-foreground">{t('common.saved')}</p>}
            <Button type="submit" className="self-start" disabled={!dirty || endBeforeStart || update.isPending}>
              {update.isPending ? t('common.saving') : t('operator.settings.saveChanges')}
            </Button>
          </form>
        ) : (
          <div>
            <Detail label={t('operator.students.monthlyFee')}>
              {monthlyFee ? `RM ${formatMoney(monthlyFee)}` : '—'}
            </Detail>
          </div>
        )}

        {billingConfig && (
          <p className="border-t pt-3 text-xs text-muted-foreground">
            {t('operator.students.scheduleNote', { day: billingConfig.due_day })}{' '}
            <Link to="/operator/settings/billing" className="underline hover:text-primary">
              {t('operator.students.scheduleLink')}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Raise this child's bill for a month by hand. Everyone is billed
 * automatically on the 1st; this is for the exceptions — re-issuing a
 * cancelled bill or billing a month the schedule skipped.
 */
function CreateBillForm({ studentId }: { studentId: number }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const createInvoice = useCreateInvoice()
  const now = new Date()
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  const monthLabels = Object.fromEntries(MONTHS.map((m) => [String(m), monthLabel(m, i18n.language)]))
  const yearLabels = Object.fromEntries(years.map((y) => [String(y), String(y)]))

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    createInvoice.mutate(
      { student_id: studentId, year: Number(year), month: Number(month) },
      { onSuccess: (invoice) => navigate(`/operator/finances/bills/${invoice.id}`) },
    )
  }

  return (
    <form className="flex flex-col gap-3 rounded-lg border p-3" onSubmit={onSubmit}>
      <p className="text-sm text-muted-foreground">{t('operator.finances.createBillDescription')}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t('common.month')}</Label>
          <Select items={monthLabels} value={month} onValueChange={(v) => v && setMonth(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {monthLabels[String(m)]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('common.year')}</Label>
          <Select items={yearLabels} value={year} onValueChange={(v) => v && setYear(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={createInvoice.isPending}>
          {createInvoice.isPending ? t('common.saving') : t('operator.finances.createBill')}
        </Button>
      </div>
      {createInvoice.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t('operator.finances.createBillError')}
        </p>
      )}
    </form>
  )
}

function Summary({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className={cn('text-2xl font-medium', emphasis && value > 0 && 'text-destructive')}>
        RM {formatMoney(value)}
      </CardContent>
    </Card>
  )
}

/**
 * Everything about one child on one page: their details, the parent and
 * siblings, billing settings, every bill, and every payment received.
 */
export function StudentDetail() {
  const { t, i18n } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const { data: student, isLoading, isError } = useOperatorStudent(studentId)
  const { data: invoices } = useInvoices({ student_id: studentId, include_void: true })
  const parentId = student?.parent_profile.id
  // The whole family's open bills: a parent pays for all their children together.
  const { data: familyInvoices } = useInvoices({ parent_id: parentId }, parentId !== undefined)
  const [showCreate, setShowCreate] = useState(false)

  // The tab lives in the URL so a refresh, or coming back from a bill, lands on the same tab.
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: Tab = TAB_VALUES.includes(requestedTab as Tab) ? (requestedTab as Tab) : 'details'
  const changeTab = (next: Tab) => setSearchParams(next === 'details' ? {} : { tab: next }, { replace: true })
  const tabs: { value: Tab; label: string }[] = [
    { value: 'details', label: t('operator.students.tabDetails') },
    { value: 'bills', label: t('operator.finances.tabBills') },
    { value: 'transactions', label: t('operator.finances.tabTransactions') },
  ]

  const bills = [...(invoices ?? [])].sort(
    (a, b) => b.period_start.localeCompare(a.period_start) || b.id - a.id,
  )
  const payments = bills
    .flatMap((invoice) => invoice.payments.map((payment) => ({ payment, invoice })))
    .sort((a, b) => b.payment.payment_date.localeCompare(a.payment.payment_date) || b.payment.id - a.payment.id)

  // Cancelled bills stay in the list for the record but were never owed.
  const counted = bills.filter((invoice) => invoice.status !== 'void')
  const totalBilled = counted.reduce((sum, invoice) => sum + Number(invoice.final_amount), 0)
  const totalPaid = counted.reduce((sum, invoice) => sum + Number(invoice.amount_paid), 0)
  const balance = counted.reduce((sum, invoice) => sum + Number(invoice.balance), 0)
  const familyBalance = (familyInvoices ?? []).reduce((sum, invoice) => sum + Number(invoice.balance), 0)

  const billsPaging = usePagination(bills)
  const paymentsPaging = usePagination(payments)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">{t('operator.students.notFound')}</p>
        <BackLink to="/operator/students">{t('operator.students.back')}</BackLink>
      </div>
    )
  }

  const parent = student.parent_profile
  const address = [parent.address_line1, parent.address_line2, [parent.postcode, parent.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  const methodLabel = (method: string) =>
    t(`operator.finances.${{ cash: 'cash', bank_transfer: 'bankTransfer', fpx: 'fpx', online: 'online' }[method] ?? 'cash'}`)
  const rowStatus = (invoice: LedgerInvoice) => (isInvoiceOverdue(invoice) ? 'overdue' : invoice.status)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink to="/operator/students">{t('operator.students.back')}</BackLink>
        <div className="flex flex-wrap items-center gap-3">
          {student.avatar_url ? (
            <img src={student.avatar_url} alt="" className="size-10 rounded-full border object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground">
              {student.full_name.charAt(0).toUpperCase()}
            </span>
          )}
          <h1 className="text-xl font-medium">{student.full_name}</h1>
          <Badge variant={enrollmentVariant[student.enrollment_status]}>
            {t(`common.status.${student.enrollment_status}`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {student.school_name} · {calculateGrade(student.date_of_birth, i18n.language)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Summary label={t('operator.finances.totalBilled')} value={totalBilled} />
        <Summary label={t('operator.finances.totalPaid')} value={totalPaid} />
        <Summary label={t('operator.finances.balance')} value={balance} emphasis />
      </div>

      <TabBar tabs={tabs} value={tab} onChange={changeTab} />

      {tab === 'details' && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('operator.students.childDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Detail label={t('parent.enroll.dateOfBirth')}>{student.date_of_birth.slice(0, 10)}</Detail>
              <Detail label={t('parent.child.gender')}>
                {student.gender ? t(`parent.child.${student.gender}`) : '—'}
              </Detail>
              <Detail label={t('parent.dashboard.school')}>{student.school_name}</Detail>
              <Detail label={t('parent.child.teacherName')}>{student.teacher_name || '—'}</Detail>
              <Detail label={t('parent.child.className')}>{student.class_name || '—'}</Detail>
              <Detail label={t('parent.child.schoolPhone')}>
                {student.school_phone ? (
                  <a href={`tel:${student.school_phone}`} className="hover:text-primary">
                    {student.school_phone}
                  </a>
                ) : (
                  '—'
                )}
              </Detail>
              <Detail label={t('parent.dashboard.package')}>{t(`common.package.${student.package_type}`)}</Detail>
              <Detail label={t('operator.students.route')}>{student.route?.name ?? '—'}</Detail>
              <Detail label={t('operator.students.pickupStop')}>{student.pickup_stop?.name ?? '—'}</Detail>
              <Detail label={t('operator.students.enrolledOn')}>{student.created_at.slice(0, 10)}</Detail>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('operator.students.parentDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Detail label={t('parent.dashboard.name')}>
                {parent.full_name}
                {parent.relationship && (
                  <span className="ml-1 text-xs text-muted-foreground capitalize">({parent.relationship})</span>
                )}
              </Detail>
              <Detail label={t('operator.students.phone')}>
                <a href={`tel:${parent.phone}`} className="hover:text-primary">
                  {parent.phone}
                </a>
              </Detail>
              <Detail label={t('operator.students.email')}>
                <a href={`mailto:${parent.email}`} className="break-all hover:text-primary">
                  {parent.email}
                </a>
              </Detail>
              <Detail label={t('operator.students.icNumber')}>{parent.ic_number}</Detail>
              <Detail label={t('operator.students.address')}>{address || '—'}</Detail>
              <Detail label={t('operator.students.emergencyContact')}>
                {parent.emergency_contact_name
                  ? `${parent.emergency_contact_name}${parent.emergency_contact_relationship ? ` (${parent.emergency_contact_relationship})` : ''} · ${parent.emergency_contact_phone ?? ''}`
                  : '—'}
              </Detail>
              <Detail label={t('operator.students.familyBalance')}>
                <span className={cn(familyBalance > 0 && 'text-destructive')}>RM {formatMoney(familyBalance)}</span>
              </Detail>
              {student.siblings.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <p className="pb-1 text-xs font-medium text-muted-foreground uppercase">
                    {t('operator.students.otherChildren')}
                  </p>
                  {student.siblings.map((sibling) => (
                    <Link
                      key={sibling.id}
                      to={`/operator/students/${sibling.id}`}
                      className="flex items-center justify-between gap-2 py-1 text-sm hover:text-primary"
                    >
                      <span>{sibling.full_name}</span>
                      <Badge variant={enrollmentVariant[sibling.enrollment_status]}>
                        {t(`common.status.${sibling.enrollment_status}`)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {tab === 'bills' && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <RecurringBill student={student} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('operator.students.billsTitle')}</CardTitle>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setShowCreate((open) => !open)}>
                  {t('operator.finances.createBill')}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {isAdmin && showCreate && <CreateBillForm studentId={student.id} />}
              {!bills.length ? (
                <p className="text-sm text-muted-foreground">{t('operator.students.noBills')}</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('operator.finances.billPeriod')}</TableHead>
                        <TableHead>{t('operator.finances.amount')}</TableHead>
                        <TableHead>{t('operator.finances.totalPaid')}</TableHead>
                        <TableHead>{t('operator.finances.balance')}</TableHead>
                        <TableHead>{t('operator.finances.dueDate')}</TableHead>
                        <TableHead>{t('operator.finances.status')}</TableHead>
                        <TableHead className="text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billsPaging.pageItems.map((invoice) => {
                        const void_ = invoice.status === 'void'
                        return (
                          <TableRow key={invoice.id} className={cn(void_ && 'text-muted-foreground')}>
                            <TableCell>
                              <Link to={`/operator/finances/bills/${invoice.id}`} className="font-medium hover:text-primary">
                                {formatPeriod(invoice.period_start, i18n.language)}
                              </Link>
                            </TableCell>
                            <TableCell className={cn(void_ && 'line-through')}>RM {formatMoney(invoice.final_amount)}</TableCell>
                            <TableCell>{void_ ? '—' : `RM ${formatMoney(invoice.amount_paid)}`}</TableCell>
                            <TableCell>{void_ ? '—' : `RM ${formatMoney(invoice.balance)}`}</TableCell>
                            <TableCell>{invoice.due_date.slice(0, 10)}</TableCell>
                            <TableCell>
                              <Badge variant={invoiceVariant[rowStatus(invoice)]}>
                                {t(`operator.finances.${rowStatus(invoice)}`)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                to={`/operator/finances/bills/${invoice.id}`}
                                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                              >
                                {t('operator.finances.openBill')}
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <Pagination page={billsPaging.page} pageCount={billsPaging.pageCount} onPageChange={billsPaging.setPage} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('operator.students.paymentsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!payments.length ? (
              <p className="text-sm text-muted-foreground">{t('operator.students.noPayments')}</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('operator.finances.date')}</TableHead>
                      <TableHead>{t('operator.finances.billPeriod')}</TableHead>
                      <TableHead>{t('operator.finances.method')}</TableHead>
                      <TableHead>{t('operator.finances.referenceNumber')}</TableHead>
                      <TableHead className="text-right">{t('operator.finances.amount')}</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsPaging.pageItems.map(({ payment, invoice }) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.payment_date.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Link to={`/operator/finances/bills/${invoice.id}`} className="hover:text-primary">
                            {formatPeriod(invoice.period_start, i18n.language)}
                          </Link>
                        </TableCell>
                        <TableCell>{methodLabel(payment.method)}</TableCell>
                        <TableCell>{payment.reference_number ?? '—'}</TableCell>
                        <TableCell className="text-right">RM {formatMoney(payment.amount_paid)}</TableCell>
                        <TableCell className="text-right">
                          <a
                            href={receiptUrl(payment.id)}
                            className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}
                          >
                            {t('common.downloadReceipt')}
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  page={paymentsPaging.page}
                  pageCount={paymentsPaging.pageCount}
                  onPageChange={paymentsPaging.setPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
