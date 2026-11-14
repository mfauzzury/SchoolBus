import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { useCancelTransitRequest, useMyTransitRequests } from '@/hooks/useTransitPortal'
import { showDate, transitStatusVariant } from '@/lib/transit'
import { cn, formatMoney } from '@/lib/utils'

/** Everything this center has asked for, and what the operator said. */
export function TransitRequests() {
  const { t } = useTranslation()
  const { data: requests, isLoading } = useMyTransitRequests()
  const cancel = useCancelTransitRequest()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('transit.portal.requests')}</CardTitle>
        <Link to="/transit/new" className={cn(buttonVariants())}>
          {t('transit.portal.askForBus')}
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : !requests?.length ? (
          <p className="text-sm text-muted-foreground">{t('transit.requests.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('transit.children.child')}</TableHead>
                <TableHead>{t('transit.requests.what')}</TableHead>
                <TableHead>{t('transit.children.price')}</TableHead>
                <TableHead>{t('transit.requests.status')}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const price = r.approved_amount ?? r.indicative_amount
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.student.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {t('transit.requests.sent', { date: showDate(r.created_at) })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.kind === 'stop' ? (
                        t('transit.requests.stopAfter', { date: showDate(r.ends_on) })
                      ) : (
                        <div className="flex flex-col">
                          {(r.legs ?? []).map((leg) => (
                            <span key={leg}>{t(`transit.legs.${leg}`)}</span>
                          ))}
                          <span className="text-muted-foreground">
                            {t('transit.children.from', { date: showDate(r.starts_on) })}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.kind === 'stop' ? '—' : price ? `RM ${formatMoney(price)}` : t('transit.portal.askOperator')}
                      {r.kind === 'start' && r.status === 'pending' && price && (
                        <span className="block text-xs text-muted-foreground">{t('transit.requests.estimate')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transitStatusVariant[r.status]}>{t(`transit.status.${r.status}`)}</Badge>
                      {r.rejection_reason && (
                        <span className="mt-1 block text-xs text-muted-foreground">{r.rejection_reason}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' && (
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="outline" size="sm">
                                {t('transit.requests.cancel')}
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('transit.requests.cancelConfirm', { name: r.student.full_name })}</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancel.mutate(r.id)}>
                                {t('transit.requests.cancel')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
