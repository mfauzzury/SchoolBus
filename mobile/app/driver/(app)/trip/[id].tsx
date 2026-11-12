import { View, Text, Pressable, ActivityIndicator, StyleSheet, FlatList, Image, Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  useAlightStudent,
  useBoardStudent,
  useEndTrip,
  useRoster,
} from '../../../../src/hooks/useTrips'
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

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tripId = Number(id)

  const { data: students, isLoading, isError } = useRoster(tripId)
  const endTrip = useEndTrip()
  const boardStudent = useBoardStudent(tripId)
  const alightStudent = useAlightStudent(tripId)

  const onEndTrip = () => {
    endTrip.mutate(tripId, { onSuccess: () => router.back() })
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
