import { View, Text, Pressable, ActivityIndicator, StyleSheet, FlatList, Image, Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  useAlightStudent,
  useBoardStudent,
  useEndTrip,
  useRoster,
  useTodayTrips,
} from '../../../../src/hooks/useTrips'
import { useTripTracking, type SharingState } from '../../../../src/hooks/useTripTracking'
import { stopTracking } from '../../../../src/lib/tripTracking'
import { colors } from '../../../../src/theme'
import type { RosterStudent } from '../../../../src/api/trips'

function StudentRow({
  student,
  onBoard,
  onAlight,
  isUpdating,
}: {
  student: RosterStudent
  onBoard: () => void
  onAlight: () => void
  isUpdating: boolean
}) {
  const classLine = [student.class_name, student.teacher_name].filter(Boolean).join(' · ')

  return (
    <View style={styles.studentRow}>
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
      {student.alighted ? (
        <Text style={styles.alightedBadge}>Alighted</Text>
      ) : student.boarded ? (
        <Pressable style={styles.alightButton} onPress={onAlight} disabled={isUpdating}>
          <Text style={styles.alightButtonText}>Alight</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.boardButton} onPress={onBoard} disabled={isUpdating}>
          <Text style={styles.boardButtonText}>Board</Text>
        </Pressable>
      )}
    </View>
  )
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
  const inProgress = trips?.find((trip) => trip.id === tripId)?.status === 'active'
  const sharing = useTripTracking(tripId, inProgress)

  const { data: students, isLoading, isError } = useRoster(tripId)
  const endTrip = useEndTrip()
  const boardStudent = useBoardStudent(tripId)
  const alightStudent = useAlightStudent(tripId)

  const onEndTrip = () => {
    endTrip.mutate(tripId, {
      onSuccess: async () => {
        await stopTracking()
        router.back()
      },
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Today</Text>
        </Pressable>
        <Pressable
          style={styles.endButton}
          onPress={onEndTrip}
          disabled={endTrip.isPending}
        >
          <Text style={styles.endButtonText}>{endTrip.isPending ? 'Ending…' : 'End trip'}</Text>
        </Pressable>
      </View>

      {inProgress && <SharingStatus state={sharing.state} onRetry={sharing.retry} />}

      <Text style={styles.sectionTitle}>Roster</Text>

      {isLoading ? (
        <ActivityIndicator style={styles.center} />
      ) : isError ? (
        <Text style={styles.center}>Could not load the roster.</Text>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(student) => String(student.id)}
          renderItem={({ item }) => (
            <StudentRow
              student={item}
              onBoard={() => boardStudent.mutate(item.id)}
              onAlight={() => alightStudent.mutate(item.id)}
              isUpdating={boardStudent.isPending || alightStudent.isPending}
            />
          )}
          ListEmptyComponent={<Text style={styles.center}>No students on this route yet.</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  back: { fontSize: 15, color: '#f59e0b', fontWeight: '600' },
  endButton: { backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  endButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },
  sharing: { borderRadius: 8, padding: 12, marginBottom: 16, gap: 8 },
  sharingText: { fontSize: 14, fontWeight: '500' },
  sharingActions: { flexDirection: 'row', gap: 20 },
  sharingLink: { fontSize: 14, fontWeight: '700', color: colors.text, textDecorationLine: 'underline' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 },
  center: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#6b7280' },
  studentInfo: { flex: 1, gap: 2 },
  schoolPhone: { fontSize: 13, color: '#f59e0b', fontWeight: '600', marginTop: 2 },
  studentName: { fontSize: 16, fontWeight: '600' },
  stopName: { fontSize: 13, color: '#6b7280' },
  boardButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  boardButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },
  alightButton: { backgroundColor: '#f59e0b', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  alightButtonText: { color: '#111827', fontWeight: '600', fontSize: 13 },
  alightedBadge: { color: '#059669', fontWeight: '600', fontSize: 13 },
})
