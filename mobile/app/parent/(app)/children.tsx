import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Badge, Card, EmptyState, ScreenTitle, type BadgeTone } from '../../../src/components/ui'
import { useMyStudents } from '../../../src/hooks/useParent'
import type { Student } from '../../../src/api/parent'
import { colors } from '../../../src/theme'

const ENROLLMENT: Record<Student['enrollment_status'], { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'warning' },
  withdrawn: { label: 'Withdrawn', tone: 'danger' },
}

const PACKAGE: Record<Student['package_type'], string> = {
  one_way: 'One way',
  return: 'Return',
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function StudentCard({ student }: { student: Student }) {
  const status = ENROLLMENT[student.enrollment_status]
  const route = student.route

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.name}>{student.full_name}</Text>
          <Text style={styles.school} numberOfLines={1}>{student.school_name}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      <View style={styles.rows}>
        <Row icon="git-branch-outline" label="Route" value={route?.name ?? 'Not assigned'} />
        <Row icon="location-outline" label="Pickup stop" value={student.pickup_stop?.name ?? '—'} />
        <Row icon="bus-outline" label="Bus" value={route?.bus?.plate_number ?? '—'} />
        <Row icon="swap-horizontal-outline" label="Package" value={PACKAGE[student.package_type]} />
      </View>

      {route?.driver && (
        <Pressable style={styles.driver} onPress={() => Linking.openURL(`tel:${route.driver!.phone}`)}>
          <View style={styles.flex}>
            <Text style={styles.driverLabel}>Driver</Text>
            <Text style={styles.driverName}>{route.driver.full_name}</Text>
          </View>
          <View style={styles.callIcon}>
            <Ionicons name="call" size={16} color={colors.text} />
          </View>
        </Pressable>
      )}
    </Card>
  )
}

export default function ChildrenScreen() {
  const insets = useSafeAreaInsets()
  const { data: students, isLoading, isError, refetch, isRefetching } = useMyStudents()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      data={students}
      keyExtractor={(student) => String(student.id)}
      renderItem={({ item }) => <StudentCard student={item} />}
      ListHeaderComponent={<ScreenTitle title="My children" />}
      ListEmptyComponent={
        isError ? (
          <EmptyState icon="cloud-offline-outline" title="Couldn't load your children" body="Pull down to try again." />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No children enrolled yet"
            body="Enroll a child from the parent portal on the web."
          />
        )
      }
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  card: { gap: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  school: { fontSize: 13, color: colors.muted, marginTop: 2 },
  rows: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 14, color: colors.muted, width: 92 },
  rowValue: { fontSize: 14, color: colors.text, flex: 1 },
  driver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  driverLabel: { fontSize: 12, color: colors.muted },
  driverName: { fontSize: 14, fontWeight: '600', color: colors.text },
  callIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
