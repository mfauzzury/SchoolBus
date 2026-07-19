import { useMemo, useState } from 'react'

const DEFAULT_PAGE_SIZE = 10

export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)

  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  )

  return { page: currentPage, setPage, pageCount, pageItems, totalCount: items.length }
}
