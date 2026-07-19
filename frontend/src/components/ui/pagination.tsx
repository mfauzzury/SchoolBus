import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation()

  if (pageCount <= 1) return null

  return (
    <div className="flex items-center justify-between pt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft />
        {t('common.previous')}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t('common.pageOf', { page, pageCount })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        {t('common.next')}
        <ChevronRight />
      </Button>
    </div>
  )
}
