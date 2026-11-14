import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { useTransitRequests } from '@/hooks/useTransitRequests'
import { showDate, transitStatusVariant } from '@/lib/transit'
import { cn } from '@/lib/utils'

const ALL = 'all'
const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const

/** Requests from transit centers, oldest waiting first. */
export function TransitRequestsPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<string>('pending')
  const { data: requests, isLoading } = useTransitRequests(status === ALL ? undefined : status)
  const { page, setPage, pageCount, pageItems } = usePagination(requests ?? [])
  useEffect(() => setPage(1), [status, setPage])

  const statusItems = {
    [ALL]: t('common.allStatuses'),
    ...Object.fromEntries(STATUSES.map((s) => [s, t(`transit.status.${s}`)])),
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('operator.transitRequests.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('operator.transitRequests.intro')}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t('transit.requests.status')}</Label>
          <Select items={statusItems} value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : !requests?.length ? (
          <p className="text-sm text-muted-foreground">{t('operator.transitRequests.empty')}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transit.children.child')}</TableHead>
                  <TableHead>{t('operator.transitRequests.center')}</TableHead>
                  <TableHead>{t('transit.requests.what')}</TableHead>
                  <TableHead>{t('transit.requests.status')}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.student.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.student.parent_profile?.full_name} · {r.student.parent_profile?.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{r.transit_center.name}</TableCell>
                    <TableCell className="text-sm">
                      {r.kind === 'stop'
                        ? t('transit.requests.stopAfter', { date: showDate(r.ends_on) })
                        : t('operator.transitRequests.startSummary', {
                            count: r.legs?.length ?? 0,
                            date: showDate(r.starts_on),
                          })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transitStatusVariant[r.status]}>{t(`transit.status.${r.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/operator/transit-requests/${r.id}`}
                        className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                      >
                        {r.status === 'pending' ? t('operator.applications.review') : t('operator.transitRequests.view')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
