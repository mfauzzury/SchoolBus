import { useEffect } from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet, FlatList } from 'react-native'
import { router } from 'expo-router'
import { useMe, useLogout } from '../../../src/hooks/useAuth'
import { useStartTrip, useTodayTrips } from '../../../src/hooks/useTrips'
import type { Trip } from '../../../src/api/trips'
import { startTracking, stopTracking, trackedTripId } from '../../../src/lib/tripTracking'

const DIRECTION_LABEL: Record<Trip['direction'], string> = {
  pickup: 'Morning pickup',
  dropoff: 'Afternoon dropoff',
}

const STATUS_LABEL: Record<Trip['status'], string> = {
  scheduled: 'Not started',
  active: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function TripRow({ trip }: { trip: Trip }) {
  const startTrip = useStartTrip()

  const onPress = () => {
    if (trip.status === 'scheduled') {
      startTrip.mutate(trip.id, {
        onSuccess: () => router.push(`/driver/trip/${trip.id}`),
      })
    } else {
      router.push(`/driver/trip/${trip.id}`)
    }
  }

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={startTrip.isPending}>
      <View style={styles.rowText}>
        <Text style={styles.routeName}>{trip.route.name}</Text>
        <Text style={styles.direction}>{DIRECTION_LABEL[trip.direction]}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.status, trip.status === 'active' && styles.statusActive]}>
          {startTrip.isPending ? 'Starting…' : STATUS_LABEL[trip.status]}
        </Text>
        <Text style={styles.chevron}>{trip.status === 'scheduled' ? 'Start ›' : 'Open ›'}</Text>
      </View>
    </Pressable>
  )
}

export default function TodayScreen() {
  const { data: me } = useMe()
  const { data: trips, isLoading, isError, refetch, isRefetching } = useTodayTrips()
  const logout = useLogout()

  // Keep location sharing in step with the trips: pick it back up if the app was
  // closed mid-trip, and stop it if no trip is running any more.
  const activeTripId = trips?.find((trip) => trip.status === 'active')?.id
  useEffect(() => {
    if (!trips) return
    void (async () => {
      if (activeTripId === undefined) await stopTracking()
      else if ((await trackedTripId()) !== activeTripId) await startTracking(activeTripId)
    })()
  }, [trips, activeTripId])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {me?.user.name ?? '…'}</Text>
          <Text style={styles.tenant}>{me?.tenant?.company_name}</Text>
        </View>
        <Pressable onPress={() => logout.mutate()}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Today's trips</Text>

      {isLoading ? (
        <ActivityIndicator style={styles.center} />
      ) : isError ? (
        <Text style={styles.center}>Could not load today's trips.</Text>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(trip) => String(trip.id)}
          renderItem={({ item }) => <TripRow trip={item} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={<Text style={styles.center}>No routes assigned to you yet.</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 20, fontWeight: '600' },
  tenant: { fontSize: 14, color: '#6b7280' },
  logout: { color: '#dc2626', fontSize: 14, fontWeight: '500' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 },
  center: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowText: { gap: 2 },
  routeName: { fontSize: 16, fontWeight: '600' },
  direction: { fontSize: 13, color: '#6b7280' },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  status: { fontSize: 13, color: '#6b7280' },
  statusActive: { color: '#059669', fontWeight: '600' },
  chevron: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },
})
