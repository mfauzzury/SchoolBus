import { useEffect } from 'react'
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pagination } from '@/components/ui/pagination'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useBuses } from '@/hooks/useBuses'
import { useStaff } from '@/hooks/useStaff'
import { useCreateRoute, useDeleteRoute, useRoutes } from '@/hooks/useRoutes'
import type { Route } from '@/api/routes'
import { usePagination } from '@/hooks/usePagination'
import { useListView } from '@/hooks/useListView'
import { FilterSelect, ListToolbar, SortableHead } from '@/components/ListControls'
import { cn, formatMoney } from '@/lib/utils'

// Filter value for routes that have no bus (or no driver) assigned.
const NONE = 'none'

export function Routes() {
  const { t } = useTranslation()
  const { data: routes, isLoading } = useRoutes()
  const { data: buses } = useBuses()
  const { data: drivers } = useStaff('driver')
  const deleteRoute = useDeleteRoute()
  const createRoute = useCreateRoute()
  const isAdmin = useIsOperatorAdmin()
  // Saves a copy straight away; the list refreshes and shows it next to the original.
  const duplicate = (route: Route) =>
    createRoute.mutate({
      name: `${route.name} ${t('operator.routes.copySuffix')}`,
      session: route.session,
      zone: route.zone,
      school_destination: route.school_destination,
      base_monthly_fee: route.base_monthly_fee ? Number(route.base_monthly_fee) : null,
      one_way_monthly_fee: route.one_way_monthly_fee ? Number(route.one_way_monthly_fee) : null,
      bus_id: route.bus_id,
      driver_id: route.driver_id,
      conductor_id: route.conductor_id,
      stops: [...route.stops]
        .sort((a, b) => a.sequence - b.sequence)
        .map((stop, i) => ({ name: stop.name, sequence: i + 1 })),
    })

  const view = useListView(routes ?? [], {
    searchText: (r) => [r.name, r.zone, r.school_destination, r.bus?.plate_number, r.driver?.full_name, r.conductor?.full_name],
    filters: {
      session: (r, v) => r.session === v,
      bus: (r, v) => (v === NONE ? !r.bus_id : String(r.bus_id) === v),
      driver: (r, v) => (v === NONE ? !r.driver_id : String(r.driver_id) === v),
    },
    sortValues: {
      name: (r) => r.name,
      bus: (r) => r.bus?.plate_number,
      driver: (r) => r.driver?.full_name,
      students: (r) => r.students_count ?? 0,
      baseFee: (r) => (r.base_monthly_fee ? Number(r.base_monthly_fee) : null),
      oneWayFee: (r) => (r.one_way_monthly_fee ? Number(r.one_way_monthly_fee) : null),
    },
  })
  const { page, setPage, pageCount, pageItems: pagedRoutes } = usePagination(view.results)
  useEffect(() => setPage(1), [view.resetKey, setPage])

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
        <CardContent className="flex flex-col gap-4">
          <ListToolbar
            query={view.query}
            onQueryChange={view.setQuery}
            placeholder={t('operator.routes.searchPlaceholder')}
            isFiltered={view.isFiltered}
            onClear={view.clear}
          >
            <FilterSelect
              label={t('operator.routes.session')}
              allLabel={t('operator.routes.allSessions')}
              value={view.filterValue('session')}
              onChange={(v) => view.setFilter('session', v)}
              options={[
                { value: 'morning', label: t('operator.routes.sessionMorning') },
                { value: 'afternoon', label: t('operator.routes.sessionAfternoon') },
              ]}
            />
            <FilterSelect
              label={t('operator.routes.bus')}
              allLabel={t('operator.routes.allBuses')}
              value={view.filterValue('bus')}
              onChange={(v) => view.setFilter('bus', v)}
              options={[
                ...(buses ?? []).map((b) => ({ value: String(b.id), label: b.plate_number })),
                { value: NONE, label: t('operator.routes.noBus') },
              ]}
            />
            <FilterSelect
              label={t('operator.routes.driver')}
              allLabel={t('operator.routes.allDrivers')}
              value={view.filterValue('driver')}
              onChange={(v) => view.setFilter('driver', v)}
              options={[
                ...(drivers ?? []).map((d) => ({ value: String(d.id), label: d.full_name })),
                { value: NONE, label: t('operator.routes.noDriver') },
              ]}
            />
          </ListToolbar>
          {createRoute.isError && (
            <p role="alert" className="text-sm text-destructive">
              {t('operator.routes.saveError')}
            </p>
          )}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : view.isFiltered && view.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('common.noMatches')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead sortKey="name" sort={view.sort} onSort={view.toggleSort}>
                    {t('operator.routes.name')} / {t('operator.routes.session')}
                  </SortableHead>
                  <SortableHead sortKey="bus" sort={view.sort} onSort={view.toggleSort}>
                    {t('operator.routes.bus')} / {t('operator.routes.stops')}
                  </SortableHead>
                  <SortableHead sortKey="driver" sort={view.sort} onSort={view.toggleSort}>
                    {t('operator.routes.driver')} / {t('operator.routes.conductor')}
                  </SortableHead>
                  <SortableHead sortKey="students" sort={view.sort} onSort={view.toggleSort}>{t('operator.routes.students')}</SortableHead>
                  <SortableHead sortKey="baseFee" sort={view.sort} onSort={view.toggleSort}>{t('operator.routes.fare')}</SortableHead>
                  {isAdmin && <TableHead className="text-right">{t('operator.routes.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{route.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {route.session
                            ? t(route.session === 'morning' ? 'operator.routes.sessionMorningShort' : 'operator.routes.sessionAfternoonShort')
                            : '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{route.bus?.plate_number ?? '—'}</span>
                        <span className="text-sm text-muted-foreground">
                          {t('operator.routes.stopsCount', { count: route.stops.length })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{route.driver?.full_name ?? '—'}</span>
                        <span>{route.conductor?.full_name ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{route.students_count ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-sm">
                        {[
                          { label: t('operator.routes.fareReturnShort'), fee: route.base_monthly_fee },
                          { label: t('operator.routes.fareOneWayShort'), fee: route.one_way_monthly_fee },
                        ].map(({ label, fee }) => (
                          <span key={label} className="flex justify-between gap-3 whitespace-nowrap">
                            <span className="text-muted-foreground">{label}</span>
                            <span>{fee ? `RM ${formatMoney(fee)}` : '—'}</span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link
                            to={`/operator/routes/${route.id}/edit`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}
                          >
                            {t('common.edit')}
                          </Link>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={createRoute.isPending}
                            onClick={() => duplicate(route)}
                          >
                            {t('operator.routes.duplicate')}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button variant="destructive" size="xs">
                                  {t('common.delete')}
                                </Button>
                              }
                            />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t('operator.routes.deleteConfirm', { name: route.name })}
                                </AlertDialogTitle>
                                {(route.students_count ?? 0) > 0 && (
                                  <AlertDialogDescription>
                                    {t('operator.routes.deleteInUse', { count: route.students_count })}
                                  </AlertDialogDescription>
                                )}
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
