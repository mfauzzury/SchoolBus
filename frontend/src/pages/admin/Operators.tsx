import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminOperators, usePlans } from '@/hooks/useAdmin'
import { planUsage } from '@/lib/plans'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { AttentionKind, OperatorFilters } from '@/api/admin'

const ALL = 'all'

type SortKey = 'company_name' | 'created_at' | 'students_count' | 'last_login_at'

export function AdminOperators() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const attention = searchParams.get('attention') ?? ALL
  const setAttention = (value: string) => setSearchParams(value === ALL ? {} : { attention: value })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL)
  const [billplz, setBillplz] = useState(ALL)
  const [planId, setPlanId] = useState(ALL)
  const [overLimit, setOverLimit] = useState(ALL)
  const { data: plans } = usePlans()
  const [sort, setSort] = useState<SortKey>('company_name')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim())

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, billplz, planId, overLimit, attention, sort])

  const filters: OperatorFilters = {
    page,
    search: debouncedSearch || undefined,
    status: status !== ALL ? (status as OperatorFilters['status']) : undefined,
    billplz: billplz !== ALL ? (billplz as OperatorFilters['billplz']) : undefined,
    attention: attention !== ALL ? (attention as AttentionKind) : undefined,
    plan_id: planId !== ALL ? Number(planId) : undefined,
    over_limit: overLimit === 'yes' ? true : undefined,
    sort,
  }
  const { data: operators, isLoading } = useAdminOperators(filters)

  const date = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
          dateStyle: 'medium',
        })
      : t('admin.operators.never')

  const statusItems = {
    [ALL]: t('common.allStatuses'),
    active: t('admin.operators.statusActive'),
    suspended: t('admin.operators.statusSuspended'),
  }
  const billplzItems = {
    [ALL]: t('admin.operators.billplzAll'),
    connected: t('admin.operators.billplzConnected'),
    none: t('admin.operators.billplzNone'),
  }
  const planItems: Record<string, string> = {
    [ALL]: t('admin.operators.planAll'),
    ...Object.fromEntries((plans ?? []).map((p) => [String(p.id), p.name])),
  }
  const attentionItems = {
    [ALL]: t('admin.operators.attentionAll'),
    new: t('admin.dashboard.attention.new.title'),
    no_billplz: t('admin.dashboard.attention.no_billplz.title'),
    no_students: t('admin.dashboard.attention.no_students.title'),
    over_limit: t('admin.dashboard.attention.over_limit.title'),
    inactive: t('admin.dashboard.attention.inactive.title'),
  }
  const limitItems = {
    [ALL]: t('admin.operators.limitAll'),
    yes: t('admin.operators.limitOver'),
  }
  const sortItems = {
    company_name: t('admin.operators.sortName'),
    created_at: t('admin.operators.sortNewest'),
    students_count: t('admin.operators.sortStudents'),
    last_login_at: t('admin.operators.sortLastLogin'),
  }

  const filterSelect = (
    label: string,
    items: Record<string, string>,
    value: string,
    onChange: (value: string) => void,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select items={items} value={value} onValueChange={(v) => onChange(v ?? ALL)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.operators.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <Label htmlFor="operator_search">{t('common.search')}</Label>
              <Input
                id="operator_search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.operators.searchPlaceholder')}
              />
            </div>
            {filterSelect(t('admin.operators.attention'), attentionItems, attention, setAttention)}
            {filterSelect(t('admin.operators.status'), statusItems, status, setStatus)}
            {filterSelect(t('admin.operators.billplz'), billplzItems, billplz, setBillplz)}
            {filterSelect(t('admin.operators.plan'), planItems, planId, setPlanId)}
            {filterSelect(t('admin.operators.studentLimit'), limitItems, overLimit, setOverLimit)}
            {filterSelect(t('admin.operators.sortBy'), sortItems, sort, (v) => setSort(v as SortKey))}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : operators?.data.length ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t('admin.operators.count', { count: operators.total })}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.operators.company')}</TableHead>
                    <TableHead>{t('admin.operators.contact')}</TableHead>
                    <TableHead>{t('admin.operators.plan')}</TableHead>
                    <TableHead>{t('admin.operators.students')}</TableHead>
                    <TableHead>{t('admin.operators.joined')}</TableHead>
                    <TableHead>{t('admin.operators.lastLogin')}</TableHead>
                    <TableHead>{t('admin.operators.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.data.map((operator) => (
                    <TableRow
                      key={operator.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/operators/${operator.id}`)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{operator.company_name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {operator.operator_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{operator.contact_phone}</span>
                          <span className="text-xs text-muted-foreground">{operator.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{operator.plan?.name ?? '—'}</TableCell>
                      <TableCell>
                        {(() => {
                          const usage = planUsage(operator)
                          return (
                            <div className="flex flex-wrap items-center gap-1">
                              <span>
                                {usage.limit === null
                                  ? usage.used
                                  : `${usage.used} / ${usage.limit}`}
                              </span>
                              {usage.over && (
                                <Badge variant="destructive">{t('admin.plans.overLimit')}</Badge>
                              )}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{date(operator.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">{date(operator.last_login_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={operator.status === 'suspended' ? 'destructive' : 'success'}>
                            {operator.status === 'suspended'
                              ? t('admin.operators.statusSuspended')
                              : t('admin.operators.statusActive')}
                          </Badge>
                          {!operator.billplz_enabled && (
                            <Badge variant="outline">{t('admin.operators.noBillplz')}</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={operators.current_page}
                pageCount={operators.last_page}
                onPageChange={setPage}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {debouncedSearch || status !== ALL || billplz !== ALL || planId !== ALL || overLimit !== ALL || attention !== ALL
                ? t('admin.operators.noMatches')
                : t('admin.operators.noOperators')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
