import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableHead } from '@/components/ui/table'
import { ALL, type SortState } from '@/hooks/useListView'
import { cn } from '@/lib/utils'

/** The row of search box, filters and "clear" that sits above a table. */
export function ListToolbar({
  query,
  onQueryChange,
  placeholder,
  isFiltered,
  onClear,
  children,
}: {
  query: string
  onQueryChange: (value: string) => void
  placeholder: string
  isFiltered: boolean
  onClear: () => void
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="list-search">{t('common.search')}</Label>
        <Input
          id="list-search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-64"
        />
      </div>
      {children}
      {isFiltered && (
        <Button type="button" variant="ghost" onClick={onClear}>
          {t('common.clearFilters')}
        </Button>
      )}
    </div>
  )
}

export function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string
  allLabel: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        items={{ [ALL]: allLabel, ...Object.fromEntries(options.map((o) => [o.value, o.label])) }}
        value={value}
        onValueChange={(v) => onChange(v ?? ALL)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** A column heading that sorts the table when clicked. */
export function SortableHead({
  sortKey,
  sort,
  onSort,
  children,
}: {
  sortKey: string
  sort: SortState | null
  onSort: (key: string) => void
  children: React.ReactNode
}) {
  const active = sort?.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="-ml-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 hover:text-foreground"
      >
        {children}
        <Icon className={cn('size-3.5', active ? 'text-foreground' : 'text-muted-foreground/60')} aria-hidden />
      </button>
    </TableHead>
  )
}
