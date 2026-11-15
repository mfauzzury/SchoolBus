import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { TabBar } from '@/components/TabBar'
import { useStudentApplications } from '@/hooks/useStudentApplications'
import { useTransitRequests } from '@/hooks/useTransitRequests'
import { TransitRequestsTab } from '@/pages/operator/TransitRequests'
import { usePagination } from '@/hooks/usePagination'
import type { OperatorStudentApplication } from '@/api/studentApplications'
import { cn } from '@/lib/utils'

const ALL = 'all'

const statusVariant: Record<OperatorStudentApplication['status'], 'success' | 'info' | 'destructive'> = {
  pending: 'info',
  approved: 'success',
  rejected: 'destructive',
}

type Tab = 'children' | 'transit'
const TABS: Tab[] = ['children', 'transit']

/**
 * Everything waiting for the operator's answer, on one page: parents asking
 * for a place for a new child, and transit centers asking for a bus. The tab
 * lives in the address so a refresh or the Back button lands on the same one.
 */
export function Applications() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: pendingChildren } = useStudentApplications({ status: 'pending' })
  const { data: pendingTransit } = useTransitRequests('pending')

  const requested = searchParams.get('tab')
  // With nothing else asked, open on the tab that has something waiting.
  const onlyTransitWaiting = pendingChildren?.length === 0 && (pendingTransit?.length ?? 0) > 0
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : onlyTransitWaiting ? 'transit' : 'children'
  const changeTab = (next: Tab) => setSearchParams(next === 'children' ? {} : { tab: next }, { replace: true })

  const withCount = (label: string, count?: number) => (count ? `${label} (${count})` : label)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t('operator.applications.title')}</h1>
      <TabBar
        tabs={[
          { value: 'children', label: withCount(t('operator.applications.tabChildren'), pendingChildren?.length) },
          { value: 'transit', label: withCount(t('operator.applications.tabTransit'), pendingTransit?.length) },
        ]}
        value={tab}
        onChange={changeTab}
      />
      {tab === 'children' ? <ChildApplicationsTab /> : <TransitRequestsTab />}
    </div>
  )
}

/** Parents asking for a place for a new child. */
function ChildApplicationsTab() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('pending')

  const { data: applications, isLoading } = useStudentApplications({
    status: status !== ALL ? status : undefined,
  })

  const { page, setPage, pageCount, pageItems: pagedApplications } = usePagination(applications ?? [])

  useEffect(() => {
    setPage(1)
  }, [status, setPage])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.applications.status')}</Label>
              <Select
                items={{
                  [ALL]: t('common.allStatuses'),
                  pending: t('operator.applications.statusPending'),
                  approved: t('operator.applications.statusApproved'),
                  rejected: t('operator.applications.statusRejected'),
                }}
                value={status}
                onValueChange={(v) => setStatus(v ?? ALL)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('operator.applications.statusPending')}</SelectItem>
                  <SelectItem value="approved">{t('operator.applications.statusApproved')}</SelectItem>
                  <SelectItem value="rejected">{t('operator.applications.statusRejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : !applications?.length ? (
            <p className="text-sm text-muted-foreground">{t('operator.applications.noApplications')}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('operator.applications.student')}</TableHead>
                    <TableHead>{t('operator.applications.parent')}</TableHead>
                    <TableHead>{t('operator.applications.package')}</TableHead>
                    <TableHead>{t('operator.applications.submitted')}</TableHead>
                    <TableHead>{t('operator.applications.status')}</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{application.full_name}</span>
                          <span className="text-xs text-muted-foreground">{application.school_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{application.parent_profile?.full_name ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {application.parent_profile?.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {t(`common.package.${application.package_type}`)}
                      </TableCell>
                      <TableCell>{application.created_at.slice(0, 10)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[application.status]}>
                          {t(`operator.applications.status${application.status.charAt(0).toUpperCase()}${application.status.slice(1)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/operator/applications/${application.id}`}
                          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                        >
                          {t('operator.applications.review')}
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
    </div>
  )
}
