import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useCreateNextBills, useNextBills } from '@/hooks/useNextBills'
import { usePagination } from '@/hooks/usePagination'
import { formatMoney, formatPeriod } from '@/lib/utils'

const ALL = 'all'
const PAGE_SIZE = 25

function formatDay(dateStr: string, language: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Every bill that is still to be made, before anything is sent. Operators on
 * automatic can look and fix problems before the morning run; operators who
 * create their own bills untick anyone to leave out and press Create.
 */
export function NextBills() {
  const { t, i18n } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const { data, isLoading, isError } = useNextBills()
  const createBills = useCreateNextBills()

  const [search, setSearch] = useState('')
  const [routeId, setRouteId] = useState(ALL)
  // Everyone is ticked to begin with; this holds the ones the operator unticked.
  const [unticked, setUnticked] = useState<Set<number>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const manual = data?.mode === 'manual'
  const canCreate = manual && isAdmin
  const rows = useMemo(() => data?.rows ?? [], [data])

  const routes = useMemo(() => {
    const seen = new Map<number, string>()
    for (const row of rows) if (row.route_id && row.route_name) seen.set(row.route_id, row.route_name)
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const query = search.trim().toLowerCase()
  const filtered = rows.filter(
    (row) =>
      (routeId === ALL || String(row.route_id) === routeId) &&
      (!query ||
        row.student_name.toLowerCase().includes(query) ||
        (row.parent_name?.toLowerCase().includes(query) ?? false)),
  )

  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, routeId, setPage])

  // A fresh list (after creating bills) starts with everyone ticked again.
  useEffect(() => {
    setUnticked(new Set())
    setConfirming(false)
  }, [data])

  const selected = rows.filter((row) => !unticked.has(row.student_id))
  const selectedTotal = selected.reduce((sum, row) => sum + row.amount, 0)
  const allFilteredTicked = filtered.length > 0 && filtered.every((row) => !unticked.has(row.student_id))

  const toggle = (id: number, checked: boolean) =>
    setUnticked((current) => {
      const next = new Set(current)
      if (checked) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAllFiltered = (checked: boolean) =>
    setUnticked((current) => {
      const next = new Set(current)
      for (const row of filtered) {
        if (checked) next.delete(row.student_id)
        else next.add(row.student_id)
      }
      return next
    })

  const create = () => {
    if (!data) return
    createBills.mutate({ month: data.month.slice(0, 7), student_ids: selected.map((row) => row.student_id) })
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  if (isError || !data) return <p className="text-sm text-destructive">{t('operator.nextBills.loadError')}</p>

  const monthName = formatPeriod(data.month, i18n.language)
  const nothingToDo = rows.length === 0 && data.problems.length === 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-medium">{t('operator.nextBills.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {manual
            ? t('operator.nextBills.manualIntro')
            : data.is_current_month
              ? t('operator.nextBills.autoIntroNow')
              : t('operator.nextBills.autoIntro', { month: monthName })}
        </p>
      </div>

      {createBills.isSuccess && (
        <Card size="sm" className="bg-emerald-50 text-emerald-950 ring-emerald-300/70 dark:bg-emerald-400/10 dark:text-emerald-100 dark:ring-emerald-400/30">
          <CardContent className="text-sm">
            {t('operator.nextBills.created', { count: createBills.data.created })}
            {createBills.data.failed > 0 && ` ${t('operator.nextBills.createdFailed', { count: createBills.data.failed })}`}
          </CardContent>
        </Card>
      )}

      {data.problems.length > 0 && (
        <Card size="sm" className="bg-amber-50 text-amber-950 ring-amber-300/70 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" aria-hidden />
              {t('operator.nextBills.problemsTitle', { count: data.problems.length })}
            </CardTitle>
            <p className="text-sm opacity-80">{t('operator.nextBills.problemsHint')}</p>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm">
              {data.problems.map((problem) => (
                <li key={problem.student_id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{problem.student_name}</span>
                    <span className="opacity-80"> — {t(`operator.nextBills.reason.${problem.reason}`)}</span>
                  </span>
                  <Link to={`/operator/students/${problem.student_id}`} className="font-medium underline underline-offset-2">
                    {t('operator.nextBills.fix')}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{monthName}</CardTitle>
          <p className="text-sm text-muted-foreground" data-testid="next-bills-summary">
            {t('operator.nextBills.summary', { count: rows.length, total: formatMoney(data.total) })}
            {data.already_billed > 0 && ` · ${t('operator.nextBills.alreadyBilled', { count: data.already_billed })}`}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {nothingToDo ? (
            <p className="text-sm text-muted-foreground">{t('operator.nextBills.nothing', { month: monthName })}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="next-bills-search">{t('common.search')}</Label>
                  <Input
                    id="next-bills-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('operator.nextBills.searchPlaceholder')}
                    className="w-64"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('operator.students.route')}</Label>
                  <Select
                    items={{ [ALL]: t('common.allRoutes'), ...Object.fromEntries(routes.map(([id, name]) => [String(id), name])) }}
                    value={routeId}
                    onValueChange={(v) => setRouteId(v ?? ALL)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>{t('common.allRoutes')}</SelectItem>
                      {routes.map(([id, name]) => (
                        <SelectItem key={id} value={String(id)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {rows.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canCreate && (
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label={t('operator.nextBills.selectAll')}
                            checked={allFilteredTicked}
                            onCheckedChange={(checked) => toggleAllFiltered(checked)}
                          />
                        </TableHead>
                      )}
                      <TableHead>{t('operator.nextBills.student')}</TableHead>
                      <TableHead>{t('operator.nextBills.parent')}</TableHead>
                      <TableHead>{t('operator.students.route')}</TableHead>
                      <TableHead className="text-right">{t('operator.nextBills.amount')}</TableHead>
                      <TableHead>{t('operator.nextBills.dueDate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((row) => (
                      <TableRow key={row.student_id} className={unticked.has(row.student_id) ? 'opacity-50' : undefined}>
                        {canCreate && (
                          <TableCell>
                            <Checkbox
                              aria-label={row.student_name}
                              checked={!unticked.has(row.student_id)}
                              onCheckedChange={(checked) => toggle(row.student_id, checked)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <Link to={`/operator/students/${row.student_id}`} className="hover:text-primary">
                            {row.student_name}
                          </Link>
                        </TableCell>
                        <TableCell>{row.parent_name ?? '—'}</TableCell>
                        <TableCell>
                          {row.route_name}{' '}
                          <span className="text-xs text-muted-foreground">
                            {t(row.package_type === 'one_way' ? 'operator.nextBills.oneWay' : 'operator.nextBills.return')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>RM {formatMoney(row.amount)}</div>
                          {row.sibling_discount_rate > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {t('operator.nextBills.siblingDiscount', { rate: row.sibling_discount_rate })}
                            </div>
                          )}
                          {row.is_custom_fee && (
                            <Badge variant="outline" className="mt-0.5">
                              {t('operator.nextBills.customFee')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDay(row.due_date, i18n.language)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filtered.length === 0 && rows.length > 0 && (
                <p className="text-sm text-muted-foreground">{t('common.noMatches')}</p>
              )}
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

              {canCreate && rows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-sm">
                    {t('operator.nextBills.ticked', { count: selected.length, total: formatMoney(selectedTotal) })}
                  </p>
                  {confirming ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">
                        {t('operator.nextBills.confirm', { count: selected.length })}
                      </span>
                      <Button onClick={create} disabled={createBills.isPending || selected.length === 0}>
                        {createBills.isPending ? t('operator.nextBills.creating') : t('operator.nextBills.yesCreate')}
                      </Button>
                      <Button variant="outline" onClick={() => setConfirming(false)} disabled={createBills.isPending}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setConfirming(true)} disabled={selected.length === 0}>
                      {t('operator.nextBills.createButton', { count: selected.length })}
                    </Button>
                  )}
                </div>
              )}
              {createBills.isError && <p className="text-sm text-destructive">{t('operator.nextBills.createError')}</p>}
              {manual && !isAdmin && (
                <p className="text-sm text-muted-foreground">{t('operator.nextBills.adminOnly')}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {data.last_run
          ? t(data.last_run.source === 'auto' ? 'operator.nextBills.lastRunAuto' : 'operator.nextBills.lastRunManual', {
              date: formatDay(data.last_run.at.slice(0, 10), i18n.language),
              generated: data.last_run.generated,
              skipped: data.last_run.skipped,
            })
          : t('operator.nextBills.noLastRun')}
      </p>
    </div>
  )
}
