import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BusMapView } from '../../../src/components/BusMapView'
import { Badge, EmptyState, type BadgeTone } from '../../../src/components/ui'
import { useNow, useParentTrips } from '../../../src/hooks/useParent'
import {
  signalState,
  type SignalState,
  type TrackedStudent,
  type TrackedTrip,
  type TrackedTripStatus,
} from '../../../src/api/tracking'
import { firstName, formatAgo, formatTime } from '../../../src/lib/format'
import { colors } from '../../../src/theme'

const STATUS: Record<TrackedTripStatus, { label: string; tone: BadgeTone }> = {
  scheduled: { label: 'Not started', tone: 'neutral' },
  active: { label: 'On the way', tone: 'success' },
  completed: { label: 'Completed', tone: 'info' },
}

const DIRECTION = { pickup: 'Morning pickup', dropoff: 'Afternoon drop-off' }

const SIGNAL: Record<SignalState, { color: string; text: (ago: string) => string }> = {
  live: { color: colors.signalLive, text: (ago) => `Live · updated ${ago}` },
  stale: { color: colors.signalStale, text: (ago) => `Weak signal · last seen ${ago}` },
  lost: { color: colors.signalLost, text: (ago) => `Signal lost · last seen ${ago}` },
  none: { color: colors.signalNone, text: () => 'Waiting for the bus location…' },
}

const statusPriority: Record<TrackedTripStatus, number> = { active: 0, scheduled: 1, completed: 2 }

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
}: {
  items: ChildTrip[]
  selectedId: number
  onSelect: (id: number) => void
}) {
  if (items.length < 2) return null
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map(({ student, trip }) => {
        const selected = student.id === selectedId
        return (
          <Pressable
            key={student.id}
            onPress={() => onSelect(student.id)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            {trip.status === 'active' && (
              <View style={[styles.chipDot, { backgroundColor: selected ? colors.text : colors.signalLive }]} />
            )}
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{firstName(student.full_name)}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function StatusLine({ icon, children, color }: { icon: keyof typeof Ionicons.glyphMap; children: string; color?: string }) {
  return (
    <View style={styles.statusLine}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={[styles.statusText, color ? { color } : null]}>{children}</Text>
    </View>
  )
}

function TripPanel({ item, now }: { item: ChildTrip; now: number }) {
  const { student, trip } = item
  const signal = signalState(trip.location, now)
  const status = STATUS[trip.status]

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={styles.flex}>
          <Text style={styles.childName} numberOfLines={1}>{student.full_name}</Text>
          <Text style={styles.routeName} numberOfLines={1}>
            {DIRECTION[trip.direction]} · {trip.route.name}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      <View style={styles.statusBlock}>
        {student.alighted_at ? (
          <StatusLine icon="checkmark-circle-outline">{`Dropped off at ${formatTime(student.alighted_at)}`}</StatusLine>
        ) : student.boarded_at ? (
          <StatusLine icon="checkmark-circle-outline">{`Boarded at ${formatTime(student.boarded_at)}`}</StatusLine>
        ) : (
          <StatusLine icon="time-outline">{trip.status === 'completed' ? 'Did not board' : 'Waiting to board'}</StatusLine>
        )}

        {trip.status === 'active' && (
          <View style={styles.statusLine}>
            <View style={styles.signalDotWrap}>
              <View style={[styles.signalDot, { backgroundColor: SIGNAL[signal].color }]} />
            </View>
            <Text style={[styles.statusText, signal === 'lost' && { color: colors.danger }]}>
              {SIGNAL[signal].text(trip.location ? formatAgo(trip.location.recorded_at, now) : '')}
              {signal === 'live' && trip.location?.speed != null ? (
                <Text style={styles.mutedText}>{` · ${Math.round(trip.location.speed)} km/h`}</Text>
              ) : null}
            </Text>
          </View>
        )}
        {trip.status === 'active' && signal === 'lost' && (
          <Text style={styles.hint}>The driver's phone may be offline. Call the driver if you're concerned.</Text>
        )}
      </View>

      {trip.driver && (
        <View style={styles.driverRow}>
          <View style={styles.driverAvatar}>
            <Ionicons name="bus-outline" size={18} color={colors.warning} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.driverName} numberOfLines={1}>{trip.driver.full_name}</Text>
            <Text style={styles.mutedText}>{trip.bus?.plate_number ?? '—'}</Text>
          </View>
          <Pressable style={styles.callButton} onPress={() => Linking.openURL(`tel:${trip.driver!.phone}`)}>
            <Ionicons name="call-outline" size={16} color={colors.text} />
            <Text style={styles.callText}>Call</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

export default function TrackScreen() {
  const insets = useSafeAreaInsets()
  const now = useNow()
  const { data: trips, isLoading } = useParentTrips(now)
  const items = childTrips(trips ?? [])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [panelHeight, setPanelHeight] = useState(0)
  const selected = items.find((item) => item.student.id === selectedId) ?? items[0]

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!selected) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <EmptyState icon="bus-outline" title="No trips today" body="None of your children are on a bus trip today." />
      </View>
    )
  }

  const { trip } = selected
  // Parents only see the bus while the trip is running — once it ends the
  // bus is no longer trackable, even if a last position is on record.
  const location = trip.status === 'active' ? trip.location : null
  const [placeholderTitle, placeholderBody] =
    trip.status === 'completed'
      ? ['Trip completed', `The trip ended at ${trip.ended_at ? formatTime(trip.ended_at) : '—'}. The bus is no longer being tracked.`]
      : trip.status === 'scheduled'
        ? ["Trip hasn't started yet", 'The bus will appear on the map once the driver starts the trip.']
        : ['Trip started', 'Waiting for the first location from the bus. This usually takes a few seconds.']

  return (
    <View style={styles.container}>
      {location ? (
        <BusMapView
          key={trip.id}
          location={location}
          signal={signalState(location, now)}
          label={trip.bus?.plate_number ?? ''}
          style={StyleSheet.absoluteFill}
          recenterOffset={panelHeight + 24}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { paddingBottom: panelHeight + 24 }]}>
          <EmptyState icon="bus-outline" title={placeholderTitle} body={placeholderBody} />
        </View>
      )}

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <ChildChips items={items} selectedId={selected.student.id} onSelect={setSelectedId} />
      </View>

      <View style={styles.bottom} onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}>
        <TripPanel item={selected} now={now} />
      </View>
    </View>
  )
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...shadow,
    shadowOpacity: 0.1,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextSelected: { color: colors.text },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  panel: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 14, ...shadow },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  childName: { fontSize: 17, fontWeight: '600', color: colors.text },
  routeName: { fontSize: 13, color: colors.muted, marginTop: 2 },
  statusBlock: { gap: 8 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  signalDotWrap: { width: 16, alignItems: 'center' },
  signalDot: { width: 8, height: 8, borderRadius: 4 },
  mutedText: { fontSize: 13, color: colors.muted },
  hint: { fontSize: 12, color: colors.muted },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { fontSize: 14, fontWeight: '600', color: colors.text },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  callText: { fontSize: 14, fontWeight: '600', color: colors.text },
})
