import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { FilterSelect, ListToolbar, SortableHead } from '@/components/ListControls'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useTransitCenters } from '@/hooks/useTransitCenters'
import { usePagination } from '@/hooks/usePagination'
import { useListView } from '@/hooks/useListView'
import { cn } from '@/lib/utils'

/** Tuition and daycare centers that can ask for a bus for their children. */
export function TransitCenters() {
  const { t } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const { data: centers, isLoading } = useTransitCenters()
  const view = useListView(centers ?? [], {
    searchText: (c) => [c.name, c.phone, c.contact_person ?? '', c.email],
    filters: { status: (c, v) => c.status === v },
    sortValues: { name: (c) => c.name, status: (c) => c.status },
  })
  const { page, setPage, pageCount, pageItems } = usePagination(view.results)
  useEffect(() => setPage(1), [view.resetKey, setPage])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>{t('operator.transitCenters.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('operator.transitCenters.intro')}</p>
          </div>
          {isAdmin && (
            <Link to="/operator/transit-centers/new" className={cn(buttonVariants())}>
              {t('operator.transitCenters.add')}
            </Link>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListToolbar
            query={view.query}
            onQueryChange={view.setQuery}
            placeholder={t('operator.transitCenters.searchPlaceholder')}
            isFiltered={view.isFiltered}
            onClear={view.clear}
          >
            <FilterSelect
              label={t('operator.transitCenters.status')}
              allLabel={t('common.allStatuses')}
              value={view.filterValue('status')}
              onChange={(v) => view.setFilter('status', v)}
              options={[
                { value: 'active', label: t('common.status.active') },
                { value: 'inactive', label: t('common.status.inactive') },
              ]}
            />
          </ListToolbar>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (centers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('operator.transitCenters.empty')}</p>
          ) : view.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('common.noMatches')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead sortKey="name" sort={view.sort} onSort={view.toggleSort}>
                    {t('operator.transitCenters.name')}
                  </SortableHead>
                  <TableHead>{t('operator.transitCenters.contact')}</TableHead>
                  <TableHead>{t('operator.transitCenters.login')}</TableHead>
                  <SortableHead sortKey="status" sort={view.sort} onSort={view.toggleSort}>
                    {t('operator.transitCenters.status')}
                  </SortableHead>
                  {isAdmin && <TableHead className="text-right" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-medium">{center.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{center.contact_person || '—'}</span>
                        <span className="text-xs text-muted-foreground">{center.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {center.has_login ? (
                        <Badge variant="success">{t('operator.transitCenters.loginSent')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('operator.transitCenters.noLogin')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={center.status === 'active' ? 'success' : 'outline'}>
                        {t(`common.status.${center.status}`)}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Link
                          to={`/operator/transit-centers/${center.id}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}
                        >
                          {t('common.edit')}
                        </Link>
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
