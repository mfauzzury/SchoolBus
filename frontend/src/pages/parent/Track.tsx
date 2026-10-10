import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BusFront, CircleCheck, Clock, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { BusMap } from '@/components/BusMap'
import { useNow, useParentTrips, useTimeFormat } from '@/hooks/useTracking'
import {
  signalState,
  type SignalState,
  type TrackedStudent,
  type TrackedTrip,
  type TrackedTripStatus,
} from '@/api/tracking'
import { cn } from '@/lib/utils'

const statusVariant: Record<TrackedTripStatus, 'outline' | 'success' | 'info'> = {
  scheduled: 'outline',
  active: 'success',
  completed: 'info',
}

const statusPriority: Record<TrackedTripStatus, number> = { active: 0, scheduled: 1, completed: 2 }

const signalDot: Record<SignalState, string> = {
  live: 'bg-green-500',
  stale: 'bg-amber-500',
  lost: 'bg-red-500',
  none: 'bg-muted-foreground',
}

interface ChildTrip {
  student: TrackedStudent
  trip: TrackedTrip
}

/** One entry per child — the trip that matters most right now (active › upcoming › finished). */
function childTrips(trips: TrackedTrip[]): ChildTrip[] {
  const byStudent = new Map<number, ChildTrip>()
  for (const trip of trips) {
    for (const student of trip.students) {
      const current = byStudent.get(student.id)
      if (!current || statusPriority[trip.status] < statusPriority[current.trip.status]) {
        byStudent.set(student.id, { student, trip })
      }
    }
  }
  return [...byStudent.values()]
}

function ChildChips({
  items,
  selectedId,
  onSelect,
  className,
}: {
  items: ChildTrip[]
  selectedId: number
  onSelect: (id: number) => void
  className?: string
}) {
  if (items.length < 2) return null
  return (
    <div className={cn('flex gap-2 overflow-x-auto', className)}>
      {items.map(({ student, trip }) => (
        <button
          key={student.id}
          type="button"
          onClick={() => onSelect(student.id)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors',
            student.id === selectedId
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-background hover:bg-muted',
          )}
        >
          {trip.status === 'active' && (
            <span
              className={cn(
                'size-2 rounded-full',
                student.id === selectedId ? 'bg-primary-foreground' : 'bg-green-500',
              )}
            />
          )}
          {student.full_name.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}

function StatusLine({ icon: Icon, children, className }: { icon: typeof Clock; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span>{children}</span>
    </div>
  )
}

function TripPanel({ item, now, className }: { item: ChildTrip; now: number; className?: string }) {
  const { t } = useTranslation()
  const { time, ago } = useTimeFormat()
  const { student, trip } = item
  const signal = signalState(trip.location, now)

  return (
    <div className={cn('flex flex-col gap-4 rounded-2xl border bg-background p-4 shadow-lg lg:shadow-none', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{student.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {t(`tracking.direction.${trip.direction}`)} · {trip.route.name}
          </p>
        </div>
        <Badge variant={statusVariant[trip.status]}>{t(`tracking.status.${trip.status}`)}</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {student.alighted_at ? (
          <StatusLine icon={CircleCheck}>{t('tracking.child.alighted', { time: time(student.alighted_at) })}</StatusLine>
        ) : student.boarded_at ? (
          <StatusLine icon={CircleCheck}>{t('tracking.child.boarded', { time: time(student.boarded_at) })}</StatusLine>
        ) : (
          <StatusLine icon={Clock}>
            {t(trip.status === 'completed' ? 'tracking.child.notBoarded' : 'tracking.child.waiting')}
          </StatusLine>
        )}

        {trip.status === 'active' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="flex size-4 shrink-0 items-center justify-center">
              <span className={cn('size-2 rounded-full', signalDot[signal])} />
            </span>
            <span className={cn(signal === 'lost' && 'text-red-600 dark:text-red-400')}>
              {trip.location
                ? t(`tracking.signal.${signal}`, { ago: ago(trip.location.recorded_at, now) })
                : t('tracking.signal.none')}
              {signal === 'live' && trip.location?.speed != null && (
                <span className="text-muted-foreground">
                  {' · '}
                  {t('tracking.speed', { speed: Math.round(trip.location.speed) })}
                </span>
              )}
            </span>
          </div>
        )}
        {signal === 'lost' && trip.status === 'active' && (
          <p className="text-xs text-muted-foreground">{t('tracking.lostHint')}</p>
        )}
      </div>

      {trip.driver && (
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <BusFront className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{trip.driver.full_name}</p>
              <p className="text-xs text-muted-foreground">{trip.bus?.plate_number ?? '—'}</p>
            </div>
          </div>
          <a href={`tel:${trip.driver.phone}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Phone className="size-4" />
            {t('tracking.callDriver')}
          </a>
        </div>
      )}
    </div>
  )
}

/** Shown in the map's place when there's no live position to plot. */
function MapPlaceholder({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 bg-muted/50 p-8 text-center', className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-background shadow-sm">
        <BusFront className="size-7 text-muted-foreground" />
      </span>
      <div className="max-w-xs">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

export function ParentTrack() {
  const { t } = useTranslation()
  const { time } = useTimeFormat()
  const now = useNow()
  const { data: trips, isLoading } = useParentTrips()
  const items = childTrips(trips ?? [])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = items.find((item) => item.student.id === selectedId) ?? items[0]

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (!selected) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-medium">{t('tracking.title')}</h1>
        <MapPlaceholder title={t('tracking.noTripsTitle')} body={t('tracking.noTripsBody')} className="rounded-2xl border" />
      </div>
    )
  }

  const { trip } = selected
  // Location is only shown while the trip is running — once it ends the bus
  // stops being trackable by parents, even if a last position is on record.
  const showMap = trip.status === 'active' && trip.location != null
  const [placeholderTitle, placeholderBody] =
    trip.status === 'completed'
      ? [t('tracking.completedTitle'), t('tracking.completedBody', { time: trip.ended_at ? time(trip.ended_at) : '—' })]
      : trip.status === 'scheduled'
        ? [t('tracking.notStartedTitle'), t('tracking.notStartedBody')]
        : [t('tracking.waitingGpsTitle'), t('tracking.waitingGpsBody')]
  const markers =
    showMap && trip.location
      ? [
          {
            id: trip.id,
            lat: trip.location.lat,
            lng: trip.location.lng,
            heading: trip.location.heading,
            label: trip.bus?.plate_number ?? '',
            signal: signalState(trip.location, now),
          },
        ]
      : []

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden lg:block">
        <h1 className="text-xl font-medium">{t('tracking.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('tracking.subtitle')}</p>
      </div>
      <ChildChips items={items} selectedId={selected.student.id} onSelect={setSelectedId} className="hidden lg:flex" />

      {/* Mobile: full-bleed map under a floating panel (sits above the bottom nav).
          Desktop: map and panel side by side inside the normal page flow. */}
      <div className="fixed inset-0 lg:static lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-4">
        {showMap ? (
          <BusMap
            key={trip.id}
            markers={markers}
            className="absolute inset-0 lg:relative lg:h-[calc(100vh-15rem)] lg:min-h-96 lg:rounded-2xl lg:border"
          />
        ) : (
          <MapPlaceholder
            title={placeholderTitle}
            body={placeholderBody}
            className="absolute inset-0 pb-72 lg:relative lg:h-[calc(100vh-15rem)] lg:min-h-96 lg:rounded-2xl lg:border lg:pb-8"
          />
        )}

        <ChildChips
          items={items}
          selectedId={selected.student.id}
          onSelect={setSelectedId}
          className="absolute inset-x-0 top-0 z-10 px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:hidden"
        />

        <TripPanel
          item={selected}
          now={now}
          className="absolute inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 lg:static"
        />
      </div>
    </div>
  )
}
