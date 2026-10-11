import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminTransactions } from '@/hooks/useAdmin'
import { formatMoney } from '@/lib/utils'

/** One operator's received payments, paged on the server. */
export function OperatorTransactions({ operatorId }: { operatorId: number }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminTransactions({ operator_id: operatorId, page })

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : data?.data.length ? (
          <>
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
                {data.data.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.payment_date.slice(0, 10)}</TableCell>
                    <TableCell>{txn.invoice.student.full_name}</TableCell>
                    <TableCell>{txn.invoice.route?.name ?? '—'}</TableCell>
                    <TableCell>
                      {t(`operator.finances.${txn.method === 'bank_transfer' ? 'bankTransfer' : txn.method}`)}
                    </TableCell>
                    <TableCell>{txn.reference_number ?? '—'}</TableCell>
                    <TableCell className="text-right">RM {formatMoney(txn.amount_paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.current_page} pageCount={data.last_page} onPageChange={setPage} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('admin.operatorDetail.empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}
