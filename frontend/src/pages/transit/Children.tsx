import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTransitChildren } from '@/hooks/useTransitPortal'
import { showDate } from '@/lib/transit'
import { cn, formatMoney } from '@/lib/utils'

/** The children the bus brings to and from this center now. */
export function TransitChildren() {
  const { t } = useTranslation()
  const { data: children, isLoading } = useTransitChildren()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('transit.children.title')}</CardTitle>
        <Link to="/transit/new" className={cn(buttonVariants())}>
          {t('transit.portal.askForBus')}
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : !children?.length ? (
          <p className="text-sm text-muted-foreground">{t('transit.children.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('transit.children.child')}</TableHead>
                <TableHead>{t('transit.children.bus')}</TableHead>
                <TableHead>{t('transit.children.dates')}</TableHead>
                <TableHead>{t('transit.children.price')}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {children.map((child) => (
                <TableRow key={child.request_id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{child.student.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[child.student.school_name, child.student.class_name].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      {child.legs.map((leg) => (
                        <span key={leg}>{t(`transit.legs.${leg}`)}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t('transit.children.from', { date: showDate(child.starts_on) })}
                    {child.ends_on && (
                      <span className="block text-muted-foreground">
                        {t('transit.children.until', { date: showDate(child.ends_on) })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{child.monthly_amount ? `RM ${formatMoney(child.monthly_amount)}` : '—'}</TableCell>
                  <TableCell className="text-right">
                    {child.stop_pending ? (
                      <Badge variant="info">{t('transit.children.stopAsked')}</Badge>
                    ) : child.ends_on ? null : (
                      <Link
                        to={`/transit/children/${child.student.id}/stop`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                      >
                        {t('transit.children.stop')}
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
