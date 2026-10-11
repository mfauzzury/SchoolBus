import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pagination } from '@/components/ui/pagination'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useDeleteRoute, useRoutes } from '@/hooks/useRoutes'
import { usePagination } from '@/hooks/usePagination'
import { cn, formatMoney } from '@/lib/utils'

export function Routes() {
  const { t } = useTranslation()
  const { data: routes, isLoading } = useRoutes()
  const deleteRoute = useDeleteRoute()
  const isAdmin = useIsOperatorAdmin()
  const { page, setPage, pageCount, pageItems: pagedRoutes } = usePagination(routes ?? [])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('operator.routes.title')}</CardTitle>
          {isAdmin && (
            <Link to="/operator/routes/new" className={cn(buttonVariants())}>
              {t('operator.routes.addRoute')}
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.routes.name')}</TableHead>
                  <TableHead>{t('operator.routes.bus')}</TableHead>
                  <TableHead>{t('operator.routes.driver')}</TableHead>
                  <TableHead>{t('operator.routes.conductor')}</TableHead>
                  <TableHead>{t('operator.routes.stops')}</TableHead>
                  <TableHead>{t('operator.routes.baseFee')}</TableHead>
                  <TableHead>{t('operator.routes.oneWayFee')}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t('operator.routes.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell>{route.name}</TableCell>
                    <TableCell>{route.bus?.plate_number ?? '—'}</TableCell>
                    <TableCell>{route.driver?.full_name ?? '—'}</TableCell>
                    <TableCell>{route.conductor?.full_name ?? '—'}</TableCell>
                    <TableCell>{route.stops.length}</TableCell>
                    <TableCell>
                      {route.base_monthly_fee ? `RM ${formatMoney(route.base_monthly_fee)}` : '—'}
                    </TableCell>
                    <TableCell>
                      {route.one_way_monthly_fee ? `RM ${formatMoney(route.one_way_monthly_fee)}` : '—'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/operator/routes/${route.id}/edit`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                          >
                            {t('common.edit')}
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button variant="destructive" size="sm">
                                  {t('common.delete')}
                                </Button>
                              }
                            />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t('operator.routes.deleteConfirm', { name: route.name })}
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteRoute.mutate(route.id)}>
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
