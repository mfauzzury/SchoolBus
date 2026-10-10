import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import type { Route } from '@/api/routes'
import type { OperatorStudent } from '@/api/operatorStudents'

// Fixed status colours (same in light and dark) for the near-full / full states.
const WARNING = '#fab219'
const CRITICAL = '#d03b3b'

// Each meter is taller than a table row, so a page is shorter than the default.
const PAGE_SIZE = 5

function severityColor(ratio: number): string {
  if (ratio >= 1) return CRITICAL
  if (ratio >= 0.85) return WARNING
  return 'var(--viz-collected)'
}

export function SeatUsageMeters({
  routes,
  students,
}: {
  routes: Route[]
  students: OperatorStudent[]
}) {
  const { t } = useTranslation()
  const { page, setPage, pageCount, pageItems } = usePagination(routes, PAGE_SIZE)

  if (routes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t('operator.dashboard.charts.noRoutes')}
      </p>
    )
  }

  const enrolled = new Map<number, number>()
  for (const s of students) {
    if (s.enrollment_status !== 'active' || !s.route) continue
    enrolled.set(s.route.id, (enrolled.get(s.route.id) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-5">
        {pageItems.map((route) => {
          const used = enrolled.get(route.id) ?? 0
          const capacity = route.bus?.capacity ?? 0
          const ratio = capacity > 0 ? used / capacity : 0
          const state = ratio >= 1 ? 'full' : ratio >= 0.85 ? 'nearlyFull' : null
          const color = severityColor(ratio)

          return (
            <li key={route.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{route.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {capacity > 0
                    ? t('operator.dashboard.charts.seatsOf', { used, capacity })
                    : t('operator.dashboard.charts.noBus')}
                </span>
              </div>
              <div
                role="meter"
                aria-label={route.name}
                aria-valuemin={0}
                aria-valuemax={capacity}
                aria-valuenow={Math.min(used, capacity)}
                className="h-2 overflow-hidden rounded-full"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--viz-collected) 18%, transparent)',
                }}
              >
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${Math.min(ratio, 1) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              {state && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                  {t(`operator.dashboard.charts.${state}`)}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  )
}
