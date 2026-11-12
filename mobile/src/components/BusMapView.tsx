import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import type { BusLocation, SignalState } from '../api/tracking'
import { colors } from '../theme'

/**
 * Native map (Apple Maps on iOS, Google Maps on Android) that tracks a
 * single bus. The camera follows the bus until the user drags the map;
 * the Recenter button resumes following.
 */

const FOLLOW_DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 }

const markerColor: Record<SignalState, string> = {
  live: colors.primary,
  stale: colors.signalStale,
  lost: colors.signalNone,
  none: colors.signalNone,
}

function BusMarker({ location, signal, label }: { location: BusLocation; signal: SignalState; label: string }) {
  const heading = location.heading != null && signal === 'live' ? Math.round(location.heading / 5) * 5 : null

  // Custom marker views are snapshotted into a bitmap; re-snapshot only when
  // the marker's look changes, not on every position tick (smoother on Android).
  const [tracksViewChanges, setTracksViewChanges] = useState(true)
  useEffect(() => {
    setTracksViewChanges(true)
    const id = setTimeout(() => setTracksViewChanges(false), 500)
    return () => clearTimeout(id)
  }, [heading, signal, label])

  return (
    <Marker
      coordinate={{ latitude: location.lat, longitude: location.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.marker}>
        <View style={styles.markerRing}>
          {heading != null && (
            <View style={[styles.headingWrap, { transform: [{ rotate: `${heading}deg` }] }]}>
              <View style={[styles.headingArrow, { borderBottomColor: markerColor[signal] }]} />
            </View>
          )}
          <View style={[styles.markerBody, { backgroundColor: markerColor[signal] }]}>
            <Ionicons name="bus" size={18} color={signal === 'lost' ? '#fff' : colors.text} />
          </View>
        </View>
        {label ? (
          <View style={styles.label}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        ) : null}
      </View>
    </Marker>
  )
}

export function BusMapView({
  location,
  signal,
  label,
  style,
  recenterOffset = 16,
}: {
  location: BusLocation
  signal: SignalState
  label: string
  style?: StyleProp<ViewStyle>
  /** Distance of the Recenter button from the map's bottom edge (clears overlays). */
  recenterOffset?: number
}) {
  const mapRef = useRef<MapView>(null)
  const [following, setFollowing] = useState(true)

  useEffect(() => {
    if (!following) return
    mapRef.current?.animateCamera(
      { center: { latitude: location.lat, longitude: location.lng } },
      { duration: 900 },
    )
  }, [following, location.lat, location.lng])

  return (
    <View style={style}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: location.lat, longitude: location.lng, ...FOLLOW_DELTA }}
        onPanDrag={() => setFollowing(false)}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
      >
        <BusMarker location={location} signal={signal} label={label} />
      </MapView>
      {!following && (
        <Pressable style={[styles.recenter, { bottom: recenterOffset }]} onPress={() => setFollowing(true)}>
          <Ionicons name="locate" size={16} color={colors.text} />
          <Text style={styles.recenterText}>Recenter</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  marker: { alignItems: 'center' },
  markerRing: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headingWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center' },
  headingArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  markerBody: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  label: {
    marginTop: -4,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  labelText: { fontSize: 11, fontWeight: '700', color: colors.text },
  recenter: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  recenterText: { fontSize: 13, fontWeight: '600', color: colors.text },
})
