import axios from 'axios'
import * as Location from 'expo-location'
import * as SecureStore from 'expo-secure-store'
import * as TaskManager from 'expo-task-manager'
import { postLocation } from '../api/trips'

/**
 * Shares the bus position with the server while a trip is in progress, so
 * parents can follow the bus. It keeps going when the driver locks the phone
 * or switches apps (a background task, with a notification on Android).
 *
 * Expo Go can't run background location, so there it falls back to sharing
 * only while the app is open — fine for trying things out.
 *
 * This file is loaded at app start (app/_layout.tsx) because a background
 * task has to be defined before any screen exists.
 */

const TASK_NAME = 'bassekolah-trip-tracking'
// The trip being shared, kept on the phone so the background task knows
// where to send positions even when no screen is open.
const TRIP_KEY = 'driver_tracking_trip_id'

export type StartResult = 'sharing' | 'denied' | 'failed'

let foregroundWatcher: Location.LocationSubscription | null = null

async function savedTripId(): Promise<number | null> {
  const value = await SecureStore.getItemAsync(TRIP_KEY)
  return value ? Number(value) : null
}

async function send(tripId: number, location: Location.LocationObject): Promise<void> {
  const { latitude, longitude, heading, speed } = location.coords

  try {
    await postLocation(tripId, {
      lat: latitude,
      lng: longitude,
      // The phone reports -1 when it doesn't know.
      heading: heading != null && heading >= 0 ? heading : null,
      // The phone reports metres per second; parents see km/h.
      speed: speed != null && speed >= 0 ? Math.round(speed * 3.6 * 10) / 10 : null,
    })
  } catch (error) {
    // No signal is normal on a bus route: the next position will get through.
    // But if the server says the trip is over (409), gone (404/403), the
    // trip isn't ours any more, there is nothing left to share.
    if (axios.isAxiosError(error) && [403, 404, 409].includes(error.response?.status ?? 0)) {
      await stopTracking()
    }
  }
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK_NAME, async ({ data, error }) => {
  if (error || !data?.locations?.length) return

  const tripId = await savedTripId()
  if (!tripId) {
    await stopTracking()
    return
  }

  // Several positions can arrive at once after a gap; only the latest matters.
  await send(tripId, data.locations[data.locations.length - 1])
})

let starting: Promise<StartResult> | null = null

/**
 * Asks for location permission, then starts sharing this trip's position.
 * Two screens may ask at once; they share one request (and one permission prompt).
 */
export function startTracking(tripId: number): Promise<StartResult> {
  starting ??= begin(tripId).finally(() => {
    starting = null
  })
  return starting
}

async function begin(tripId: number): Promise<StartResult> {
  const foreground = await Location.requestForegroundPermissionsAsync()
  if (!foreground.granted) return 'denied'

  // "Always" access lets sharing continue with the phone locked. If the driver
  // says no, sharing still works while the app is open.
  await Location.requestBackgroundPermissionsAsync().catch(() => undefined)

  await SecureStore.setItemAsync(TRIP_KEY, String(tripId))

  try {
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,
      distanceInterval: 25,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Trip in progress',
        notificationBody: 'Parents can see where the bus is.',
        killServiceOnDestroy: true,
      },
    })
    return 'sharing'
  } catch {
    // No background support here (Expo Go) or no "Always" access: share while the app is open.
    try {
      foregroundWatcher?.remove()
      foregroundWatcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 25 },
        (location) => void send(tripId, location),
      )
      return 'sharing'
    } catch {
      await SecureStore.deleteItemAsync(TRIP_KEY)
      return 'failed'
    }
  }
}

export async function stopTracking(): Promise<void> {
  await SecureStore.deleteItemAsync(TRIP_KEY)

  foregroundWatcher?.remove()
  foregroundWatcher = null

  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK_NAME).catch(() => undefined)
  }
}

/** Which trip is being shared right now, if any. */
export async function trackedTripId(): Promise<number | null> {
  const running =
    foregroundWatcher !== null ||
    (await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false))

  return running ? savedTripId() : null
}
