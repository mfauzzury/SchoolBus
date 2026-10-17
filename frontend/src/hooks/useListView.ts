import { useState } from 'react'

export const ALL = 'all'

type SortValue = string | number | null | undefined

interface ListViewConfig<T> {
  /** Text a search can match against. */
  searchText: (item: T) => (string | null | undefined)[]
  /** One test per filter; a filter set to ALL lets everything through. */
  filters?: Record<string, (item: T, value: string) => boolean>
  /** What each sortable column sorts by. */
  sortValues?: Record<string, (item: T) => SortValue>
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

// Empty values go last, whichever way the column is sorted.
function compare(a: SortValue, b: SortValue, dir: 'asc' | 'desc'): number {
  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1
  const result =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? result : -result
}

/** Search, filter and sort for a list that is already loaded in full. */
export function useListView<T>(items: T[], config: ListViewConfig<T>) {
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<SortState | null>(null)

  const filterValue = (name: string) => filterValues[name] ?? ALL
  const setFilter = (name: string, value: string) => setFilterValues((v) => ({ ...v, [name]: value }))

  // A first click sorts A to Z (or low to high); clicking again flips it.
  const toggleSort = (key: string) =>
    setSort((current) => (current?.key === key && current.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' }))

  const needle = query.trim().toLowerCase()
  let results = items.filter((item) => {
    if (needle && !config.searchText(item).some((text) => text?.toLowerCase().includes(needle))) return false
    return Object.entries(config.filters ?? {}).every(([name, test]) => filterValue(name) === ALL || test(item, filterValue(name)))
  })

  const sortValue = sort && config.sortValues?.[sort.key]
  if (sort && sortValue) {
    results = [...results].sort((a, b) => compare(sortValue(a), sortValue(b), sort.dir))
  }

  const isFiltered = needle !== '' || Object.values(filterValues).some((v) => v !== ALL)
  const clear = () => {
    setQuery('')
    setFilterValues({})
  }

  // Changes whenever the visible rows change shape, so a page can jump back to page 1.
  const resetKey = JSON.stringify([needle, filterValues, sort])

  return { query, setQuery, filterValue, setFilter, sort, toggleSort, results, isFiltered, clear, resetKey }
}
