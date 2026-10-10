import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeletePlan, usePlans } from '@/hooks/useAdmin'
import { useCan } from '@/hooks/useAuth'
import { formatMoney } from '@/lib/utils'

export function AdminPlans() {
  const { t } = useTranslation()
  const canManage = useCan('plans.manage')
  const { data: plans, isLoading } = usePlans()
  const remove = useDeletePlan()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-medium">{t('admin.plans.title')}</h1>
        {canManage && (
          <Link to="/admin/plans/new" className={cn(buttonVariants())}>
            {t('admin.plans.add')}
          </Link>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{t('admin.plans.intro')}</p>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.plans.name')}</TableHead>
                  <TableHead>{t('admin.plans.limit')}</TableHead>
                  <TableHead>{t('admin.plans.price')}</TableHead>
                  <TableHead>{t('admin.plans.operators')}</TableHead>
                  <TableHead />
                  {canManage && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{plan.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{plan.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.student_limit === null
                        ? t('admin.plans.unlimited')
                        : t('admin.plans.upTo', { count: plan.student_limit })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>RM {formatMoney(plan.monthly_price)} {t('admin.plans.perMonth')}</span>
                        <span className="text-xs text-muted-foreground">
                          RM {formatMoney(plan.price_per_student)} {t('admin.plans.perStudent')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{plan.operators_count}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {plan.is_default && <Badge variant="info">{t('admin.plans.default')}</Badge>}
                        {!plan.is_active && <Badge variant="outline">{t('admin.plans.inactive')}</Badge>}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/admin/plans/${plan.id}`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                          >
                            {t('common.edit')}
                          </Link>
                          {!plan.is_default && plan.operators_count === 0 && (
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button type="button" variant="outline" size="sm">
                                    {t('common.delete')}
                                  </Button>
                                }
                              />
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t('admin.plans.deleteConfirm', { name: plan.name })}
                                  </AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove.mutate(plan.id)}>
                                    {t('common.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {remove.isError && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.plans.error')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
