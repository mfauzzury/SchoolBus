import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TriangleAlert, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BusMap, type BusMapMarker } from '@/components/BusMap'
import { useNow, useOperatorTrips, useTimeFormat } from '@/hooks/useTracking'
import { signalState, type SignalState, type TrackedTrip, type TrackedTripStatus } from '@/api/tracking'
import { cn } from '@/lib/utils'

type Filter = 'all' | TrackedTripStatus

const FILTERS: Filter[] = ['all', 'active', 'scheduled', 'completed']

const statusVariant: Record<TrackedTripStatus, 'outline' | 'success' | 'info'> = {
  scheduled: 'outline',
  active: 'success',
  completed: 'info',
}

const signalDot: Record<SignalState, string> = {
  live: 'bg-green-500',
  stale: 'bg-amber-500',
  lost: 'bg-red-500',
  none: 'bg-muted-foreground',
}

/** Active trips with signal problems first, so dispatch sees them without scrolling. */
function sortRank(trip: TrackedTrip, now: number): number {
  if (trip.status !== 'active') return trip.status === 'scheduled' ? 4 : 5
  const signal = signalState(trip.location, now)
  return { lost: 0, stale: 1, none: 2, live: 3 }[signal]
}

function TripRow({
  trip,
  now,
  selected,
  onSelect,
}: {
  trip: TrackedTrip
  now: number
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const { time, ago } = useTimeFormat()
  const ref = useRef<HTMLButtonElement>(null)
  const signal = signalState(trip.location, now)
  const total = trip.roster_count ?? trip.students.length
  const boarded = trip.students.filter((s) => s.boarded_at).length
  const onMap = trip.status === 'active' && trip.location != null

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      disabled={!onMap}
      className={cn(
        'flex w-full flex-col gap-1.5 border-b px-4 py-3 text-left transition-colors last:border-b-0',
        onMap && 'hover:bg-muted/60',
        selected && 'bg-primary/10 hover:bg-primary/10',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium">{trip.route.name}</span>
        <Badge variant={statusVariant[trip.status]} className="shrink-0">
          {t(`tracking.status.${trip.status}`)}
        </Badge>
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {trip.driver?.full_name ?? '—'} · {trip.bus?.plate_number ?? '—'}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Users className="size-3.5" />
          {t('tracking.operator.boarded', { boarded, total })}
        </span>
        {trip.status === 'active' ? (
          <span
            className={cn(
              'flex items-center gap-1.5',
              signal === 'lost' && 'text-red-600 dark:text-red-400',
              signal === 'stale' && 'text-amber-600 dark:text-amber-400',
            )}
          >
            <span className={cn('size-2 rounded-full', signalDot[signal])} />
            {trip.location
              ? t(`tracking.signal.${signal}`, { ago: ago(trip.location.recorded_at, now) })
              : t('tracking.operator.noLocation')}
          </span>
        ) : trip.status === 'completed' && trip.ended_at ? (
          <span className="text-muted-foreground">{t('tracking.operator.endedAt', { time: time(trip.ended_at) })}</span>
        ) : null}
      </div>
    </button>
  )
}

export function OperatorLive() {
  const { t } = useTranslation()
  const now = useNow()
  const { data: trips, isLoading } = useOperatorTrips()
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const all = [...(trips ?? [])].sort((a, b) => sortRank(a, now) - sortRank(b, now))
  const visible = filter === 'all' ? all : all.filter((trip) => trip.status === filter)
  const active = all.filter((trip) => trip.status === 'active')
  const troubled = active.filter((trip) => {
    const signal = signalState(trip.location, now)
    return signal === 'stale' || signal === 'lost'
  })

  const markers: BusMapMarker[] = active.flatMap((trip) =>
    trip.location
      ? [
          {
            id: trip.id,
            lat: trip.location.lat,
            lng: trip.location.lng,
            heading: trip.location.heading,
            label: trip.bus?.plate_number ?? trip.route.name,
            signal: signalState(trip.location, now),
          },
        ]
      : [],
  )

  const mapRef = useRef<HTMLDivElement>(null)
  const toggleSelect = (id: number) => setSelectedId((current) => (current === id ? null : id))
  // Below lg the map is stacked above the list — bring it into view when a trip is picked.
  const selectFromList = (id: number) => {
    toggleSelect(id)
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      mapRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-medium">{t('tracking.operator.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('tracking.operator.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">
            <span className="size-1.5 rounded-full bg-green-500" />
            {t('tracking.operator.activeCount', { count: active.length })}
          </Badge>
          {troubled.length > 0 && (
            <Badge variant="destructive">
              <TriangleAlert className="size-3" />
              {t('tracking.operator.noSignalAlert', { count: troubled.length })}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div ref={mapRef} className="scroll-mt-4 lg:order-2">
          <BusMap
            markers={markers}
            selectedId={selectedId}
            onSelect={toggleSelect}
            follow={false}
            className="h-72 rounded-2xl border sm:h-96 lg:h-[calc(100vh-13rem)] lg:min-h-[28rem]"
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border lg:order-1 lg:h-[calc(100vh-13rem)] lg:min-h-[28rem]">
          <div className="flex flex-wrap gap-1 border-b p-2">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filter === value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {t(`tracking.operator.filter.${value}`)}
                <span className="ml-1 opacity-60">
                  {value === 'all' ? all.length : all.filter((trip) => trip.status === value).length}
                </span>
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : visible.length ? (
              visible.map((trip) => (
                <TripRow
                  key={trip.id}
                  trip={trip}
                  now={now}
                  selected={trip.id === selectedId}
                  onSelect={() => selectFromList(trip.id)}
                />
              ))
            ) : (
              <p className="p-4 text-sm text-muted-foreground">{t('tracking.operator.noTrips')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
