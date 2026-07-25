import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
import { useAdminOperators } from '@/hooks/useAdmin'
import { usePagination } from '@/hooks/usePagination'

export function AdminOperators() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: operators, isLoading } = useAdminOperators()
  const { page, setPage, pageCount, pageItems: pagedOperators } = usePagination(operators ?? [])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.operators.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : operators?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.operators.company')}</TableHead>
                    <TableHead>{t('admin.operators.code')}</TableHead>
                    <TableHead>{t('admin.operators.contact')}</TableHead>
                    <TableHead>{t('admin.operators.plan')}</TableHead>
                    <TableHead>{t('admin.operators.students')}</TableHead>
                    <TableHead>{t('admin.operators.buses')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedOperators.map((operator) => (
                    <TableRow
                      key={operator.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/operators/${operator.id}`)}
                    >
                      <TableCell>{operator.company_name}</TableCell>
                      <TableCell className="font-mono">{operator.operator_code}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{operator.contact_phone}</span>
                          <span className="text-xs text-muted-foreground">{operator.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{operator.subscription_plan}</TableCell>
                      <TableCell>{operator.students_count}</TableCell>
                      <TableCell>{operator.buses_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.operators.noOperators')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
