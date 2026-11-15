import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { FilterSelect, ListToolbar, SortableHead } from '@/components/ListControls'
import { useOperatorTransitCenters } from '@/hooks/useTransitCenters'
import { usePagination } from '@/hooks/usePagination'
import { useListView } from '@/hooks/useListView'

/**
 * Tuition and daycare centers that can ask this operator for a bus. To look
 * at only: the platform team adds and changes them.
 */
export function TransitCenters() {
  const { t } = useTranslation()
  const { data: centers, isLoading } = useOperatorTransitCenters()
  const view = useListView(centers ?? [], {
    searchText: (c) => [c.name, c.phone, c.contact_person ?? '', c.address ?? ''],
    filters: { status: (c, v) => c.status === v },
    sortValues: { name: (c) => c.name, status: (c) => c.status },
  })
  const { page, setPage, pageCount, pageItems } = usePagination(view.results)
  useEffect(() => setPage(1), [view.resetKey, setPage])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>{t('operator.transitCenters.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('operator.transitCenters.intro')}</p>
        <p className="text-sm text-muted-foreground">{t('operator.transitCenters.addedByPlatform')}</p>
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
                <TableHead>{t('operator.transitCenters.address')}</TableHead>
                <TableHead>{t('operator.transitCenters.login')}</TableHead>
                <SortableHead sortKey="status" sort={view.sort} onSort={view.toggleSort}>
                  {t('operator.transitCenters.status')}
                </SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="font-medium">{center.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{center.contact_person || '—'}</span>
                      <a href={`tel:${center.phone}`} className="text-xs text-muted-foreground hover:text-primary">
                        {center.phone}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{center.address || '—'}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </CardContent>
    </Card>
  )
}
