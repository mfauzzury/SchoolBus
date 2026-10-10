import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { useOutstanding } from '@/hooks/useFinances'
import { usePagination } from '@/hooks/usePagination'
import { formatMoney } from '@/lib/utils'

/**
 * Who owes money, per parent and largest first — a parent pays for all their
 * children together, so the parent is who the operator follows up with.
 */
export function OutstandingTab() {
  const { t } = useTranslation()
  const { data: debtors, isLoading } = useOutstanding()
  const { page, setPage, pageCount, pageItems } = usePagination(debtors ?? [])
  const totalOwed = (debtors ?? []).reduce((sum, debtor) => sum + debtor.total_outstanding, 0)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : !debtors?.length ? (
          <p className="text-sm text-muted-foreground">{t('operator.finances.noOutstanding')}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.finances.parent')}</TableHead>
                  <TableHead>{t('operator.finances.children')}</TableHead>
                  <TableHead>{t('operator.finances.unpaidBills')}</TableHead>
                  <TableHead>{t('operator.finances.oldestDue')}</TableHead>
                  <TableHead className="text-right">{t('operator.finances.owed')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((debtor) => (
                  <TableRow key={debtor.parent.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{debtor.parent.full_name}</span>
                        <span className="text-xs text-muted-foreground">{debtor.parent.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {debtor.students.map((student) => (
                          <Link
                            key={student.id}
                            to={`/operator/students/${student.id}`}
                            className="hover:text-primary"
                          >
                            {student.full_name}
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{debtor.invoice_count}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span>{debtor.oldest_due_date ?? '—'}</span>
                        {debtor.days_overdue > 0 ? (
                          <Badge variant="destructive">
                            {t('operator.finances.daysLate', { count: debtor.days_overdue })}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('operator.finances.notDue')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      RM {formatMoney(debtor.total_outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between border-t pt-3 text-sm font-medium">
              <span>{t('operator.finances.totalOutstanding')}</span>
              <span>RM {formatMoney(totalOwed)}</span>
            </div>
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
