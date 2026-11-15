import { Linking, Platform } from 'react-native'

/**
 * Opens a place in the phone's own maps app: Apple Maps on iPhone, and on
 * Android whichever maps app the phone offers (Google Maps, Waze, …). Falls
 * back to Google Maps in the browser when no app can take it.
 */
export function openDirections(lat: number, lng: number, label: string): void {
  const name = encodeURIComponent(label)
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  const url =
    Platform.select({
      ios: `https://maps.apple.com/?daddr=${lat},${lng}&q=${name}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${name})`,
    }) ?? web

  Linking.openURL(url).catch(() => Linking.openURL(web))
}
