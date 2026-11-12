import { View, Text, Pressable, ActivityIndicator, StyleSheet, FlatList, Image, Linking, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useBoardingRoster, useEndTrip, useTodayTrips } from '../../../../src/hooks/useTrips'
import { useTripTracking, type SharingState } from '../../../../src/hooks/useTripTracking'
import { queueStatus } from '../../../../src/lib/boardingQueue'
import { stopTracking } from '../../../../src/lib/tripTracking'
import type { RosterStudent, StudentStatus, TripDirection } from '../../../../src/api/trips'
import { colors } from '../../../../src/theme'

/**
 * The words for each step depend on the trip. The two steps are the same in the
 * data (on the bus, then off it) but a driver thinks about them differently:
 * in the morning a child is picked up and then reaches school; in the
 * afternoon a child gets on at school and is dropped off at home.
 */
const WORDS: Record<
  TripDirection,
  { title: string; first: string; second: string; secondDone: string; firstDone: string }
> = {
  pickup: {
    title: 'Morning pickup',
    first: 'Picked up',
    second: 'At school',
    firstDone: 'on the bus',
    secondDone: 'at school',
  },
  dropoff: {
    title: 'Afternoon dropoff',
    first: 'On the bus',
    second: 'Dropped off',
    firstDone: 'on the bus',
    secondDone: 'dropped off',
  },
}

// Children still to do come first, then those on the bus, then those finished.
const ORDER: Record<StudentStatus, number> = { waiting: 0, boarded: 1, alighted: 2, absent: 2 }

function StudentRow({
  student,
  direction,
  onSet,
}: {
  student: RosterStudent
  direction: TripDirection
  onSet: (status: StudentStatus) => void
}) {
  const words = WORDS[direction]
  const classLine = [student.class_name, student.teacher_name].filter(Boolean).join(' · ')
  const done = student.status === 'alighted' || student.status === 'absent'

  return (
    <View style={[styles.studentRow, done && styles.studentRowDone]}>
      {student.avatar_url ? (
        <Image source={{ uri: student.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{student.full_name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.full_name}</Text>
        <Text style={styles.stopName}>{student.pickup_stop?.name ?? 'No stop assigned'}</Text>
        {classLine !== '' && <Text style={styles.stopName}>{classLine}</Text>}
        {!!student.school_phone && (
          <Pressable onPress={() => Linking.openURL(`tel:${student.school_phone}`)}>
            <Text style={styles.schoolPhone}>Call school · {student.school_phone}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.actions}>
        {student.status === 'waiting' && (
          <>
            <Pressable style={styles.primaryButton} onPress={() => onSet('boarded')}>
              <Text style={styles.primaryButtonText}>{words.first}</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => onSet('absent')}>
              <Text style={styles.link}>Not coming</Text>
            </Pressable>
          </>
        )}

        {student.status === 'boarded' && (
          <>
            <Pressable style={[styles.primaryButton, styles.secondStep]} onPress={() => onSet('alighted')}>
              <Text style={[styles.primaryButtonText, styles.secondStepText]}>{words.second}</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => onSet('waiting')}>
              <Text style={styles.link}>Undo</Text>
            </Pressable>
          </>
        )}

        {student.status === 'alighted' && (
          <>
            <Text style={styles.doneBadge}>✓ {words.second}</Text>
            <Pressable hitSlop={8} onPress={() => onSet('boarded')}>
              <Text style={styles.link}>Undo</Text>
            </Pressable>
          </>
        )}

        {student.status === 'absent' && (
          <>
            <Text style={styles.absentBadge}>Not coming</Text>
            <Pressable hitSlop={8} onPress={() => onSet('waiting')}>
              <Text style={styles.link}>Undo</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

/** "3 of 12 picked up · 2 at school · 1 not coming" */
function summaryLine(students: RosterStudent[], direction: TripDirection): string {
  const words = WORDS[direction]
  const onBus = students.filter((s) => s.status === 'boarded' || s.status === 'alighted').length
  const finished = students.filter((s) => s.status === 'alighted').length
  const absent = students.filter((s) => s.status === 'absent').length

  return [
    `${onBus} of ${students.length} ${words.first.toLowerCase()}`,
    finished > 0 && `${finished} ${words.secondDone}`,
    absent > 0 && `${absent} not coming`,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Tells the driver, in plain words, whether parents can see the bus. */
function SharingStatus({ state, onRetry }: { state: SharingState; onRetry: () => void }) {
  if (state === 'sharing') {
    return (
      <View style={[styles.sharing, { backgroundColor: colors.successSoft }]}>
        <Text style={[styles.sharingText, { color: colors.success }]}>Parents can see the bus on the map.</Text>
      </View>
    )
  }

  if (state === 'starting') {
    return (
      <View style={[styles.sharing, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sharingText, { color: colors.muted }]}>Turning on location…</Text>
      </View>
    )
  }

  return (
    <View style={[styles.sharing, { backgroundColor: colors.dangerSoft }]}>
      <Text style={[styles.sharingText, { color: colors.danger }]}>
        {state === 'denied'
          ? 'Location is off, so parents cannot see the bus. Please allow location for this app.'
          : 'Could not turn on location. Parents cannot see the bus.'}
      </Text>
      <View style={styles.sharingActions}>
        {state === 'denied' && (
          <Pressable onPress={() => Linking.openSettings()}>
            <Text style={styles.sharingLink}>Open settings</Text>
          </Pressable>
        )}
        <Pressable onPress={onRetry}>
          <Text style={styles.sharingLink}>Try again</Text>
        </Pressable>
      </View>
    </View>
  )
}

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tripId = Number(id)

  const { data: trips } = useTodayTrips()
  const trip = trips?.find((t) => t.id === tripId)
  const direction: TripDirection = trip?.direction ?? 'pickup'
  const inProgress = trip?.status === 'active'
  const sharing = useTripTracking(tripId, inProgress)

  const { students, unsent, isLoading, isError } = useBoardingRoster(tripId)
  const endTrip = useEndTrip()

  const sorted = students
    ? students
        .map((student, index) => ({ student, index }))
        .sort((a, b) => ORDER[a.student.status] - ORDER[b.student.status] || a.index - b.index)
        .map(({ student }) => student)
    : undefined

  const confirmEndTrip = () => {
    const notFinished = (students ?? []).filter((s) => s.status === 'waiting' || s.status === 'boarded').length

    Alert.alert(
      'End this trip?',
      notFinished > 0
        ? `${notFinished} ${notFinished === 1 ? 'child is' : 'children are'} not finished yet. Parents will stop seeing the bus.`
        : 'Parents will stop seeing the bus.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'End trip',
          style: 'destructive',
          onPress: () =>
            endTrip.mutate(tripId, {
              onSuccess: async () => {
                await stopTracking()
                router.back()
              },
            }),
        },
      ],
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Today</Text>
        </Pressable>
        <Pressable style={styles.endButton} onPress={confirmEndTrip} disabled={endTrip.isPending}>
          <Text style={styles.endButtonText}>{endTrip.isPending ? 'Ending…' : 'End trip'}</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{trip ? `${WORDS[direction].title} · ${trip.route.name}` : 'Trip'}</Text>
      {students && students.length > 0 && <Text style={styles.summary}>{summaryLine(students, direction)}</Text>}

      {unsent > 0 && (
        <View style={[styles.sharing, { backgroundColor: colors.warning + '22' }]}>
          <Text style={[styles.sharingText, { color: colors.warning }]}>
            {unsent === 1 ? '1 tap is' : `${unsent} taps are`} waiting for signal. It will be sent by itself.
          </Text>
        </View>
      )}

      {inProgress && <SharingStatus state={sharing.state} onRetry={sharing.retry} />}

      {isLoading ? (
        <ActivityIndicator style={styles.center} />
      ) : isError ? (
        <Text style={styles.center}>Could not load the list of children.</Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(student) => String(student.id)}
          renderItem={({ item }) => (
            <StudentRow student={item} direction={direction} onSet={(status) => queueStatus(tripId, item.id, status)} />
          )}
          ListEmptyComponent={<Text style={styles.center}>No children on this route yet.</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  back: { fontSize: 15, color: '#f59e0b', fontWeight: '600' },
  endButton: { backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  endButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  summary: { fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: 16 },
  center: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
  sharing: { borderRadius: 8, padding: 12, marginBottom: 12, gap: 8 },
  sharingText: { fontSize: 14, fontWeight: '500' },
  sharingActions: { flexDirection: 'row', gap: 20 },
  sharingLink: { fontSize: 14, fontWeight: '700', color: colors.text, textDecorationLine: 'underline' },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  studentRowDone: { opacity: 0.6 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#6b7280' },
  studentInfo: { flex: 1, gap: 2 },
  schoolPhone: { fontSize: 13, color: '#f59e0b', fontWeight: '600', marginTop: 2 },
  studentName: { fontSize: 16, fontWeight: '600' },
  stopName: { fontSize: 13, color: '#6b7280' },
  actions: { alignItems: 'center', gap: 8, minWidth: 104 },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
  secondStep: { backgroundColor: '#f59e0b' },
  secondStepText: { color: '#111827' },
  link: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
  doneBadge: { color: colors.success, fontWeight: '700', fontSize: 14 },
  absentBadge: { color: colors.muted, fontWeight: '700', fontSize: 14 },
})
