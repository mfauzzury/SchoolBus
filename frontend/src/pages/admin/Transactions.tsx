import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { useOperatorOptions, useAdminTransactions } from '@/hooks/useAdmin'
import { usePagination } from '@/hooks/usePagination'
import { formatMoney } from '@/lib/utils'

const ALL = 'all'

export function AdminTransactions() {
  const { t } = useTranslation()
  const { data: operators } = useOperatorOptions()
  const [operatorId, setOperatorId] = useState(ALL)
  const [method, setMethod] = useState(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filters = {
    operator_id: operatorId !== ALL ? Number(operatorId) : undefined,
    method: method !== ALL ? method : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }

  const { data: transactions, isLoading } = useAdminTransactions(filters)
  const { page, setPage, pageCount, pageItems: pagedTransactions } = usePagination(
    transactions ?? [],
  )

  useEffect(() => {
    setPage(1)
  }, [operatorId, method, dateFrom, dateTo, setPage])

  const totalAmount = useMemo(
    () => (transactions ?? []).reduce((sum, txn) => sum + Number(txn.amount_paid), 0),
    [transactions],
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('admin.transactions.title')}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('admin.transactions.totalCollected')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">RM {formatMoney(totalAmount)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('admin.transactions.transactionCount')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{transactions?.length ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.transactions.operator')}</Label>
              <Select
                items={{
                  [ALL]: t('admin.transactions.allOperators'),
                  ...Object.fromEntries((operators ?? []).map((o) => [String(o.id), o.company_name])),
                }}
                value={operatorId}
                onValueChange={(v) => setOperatorId(v ?? ALL)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('admin.transactions.allOperators')}</SelectItem>
                  {operators?.map((operator) => (
                    <SelectItem key={operator.id} value={String(operator.id)}>
                      {operator.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.finances.method')}</Label>
              <Select
                items={{
                  [ALL]: t('common.allStatuses'),
                  cash: t('operator.finances.cash'),
                  bank_transfer: t('operator.finances.bankTransfer'),
                  fpx: t('operator.finances.fpx'),
                  online: t('operator.finances.online'),
                }}
                value={method}
                onValueChange={(v) => setMethod(v ?? ALL)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.allStatuses')}</SelectItem>
                  <SelectItem value="cash">{t('operator.finances.cash')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('operator.finances.bankTransfer')}</SelectItem>
                  <SelectItem value="fpx">{t('operator.finances.fpx')}</SelectItem>
                  <SelectItem value="online">{t('operator.finances.online')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date_from">{t('admin.transactions.dateFrom')}</Label>
              <Input
                id="date_from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date_to">{t('admin.transactions.dateTo')}</Label>
              <Input
                id="date_to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : transactions?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.transactions.date')}</TableHead>
                    <TableHead>{t('admin.transactions.operator')}</TableHead>
                    <TableHead>{t('operator.finances.student')}</TableHead>
                    <TableHead>{t('operator.finances.route')}</TableHead>
                    <TableHead>{t('operator.finances.method')}</TableHead>
                    <TableHead>{t('operator.finances.referenceNumber')}</TableHead>
                    <TableHead className="text-right">{t('operator.finances.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{txn.payment_date.slice(0, 10)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{txn.bus_operator.company_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {txn.bus_operator.operator_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{txn.invoice.student.full_name}</TableCell>
                      <TableCell>{txn.invoice.route?.name ?? '—'}</TableCell>
                      <TableCell>{t(`operator.finances.${camelizeMethod(txn.method)}`)}</TableCell>
                      <TableCell>{txn.reference_number ?? '—'}</TableCell>
                      <TableCell className="text-right">RM {formatMoney(txn.amount_paid)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.transactions.noTransactions')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function camelizeMethod(method: string): string {
  return method === 'bank_transfer' ? 'bankTransfer' : method
}
