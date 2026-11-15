import type L from 'leaflet'

/**
 * OpenStreetMap's public tile servers forbid production-scale traffic —
 * set VITE_MAP_TILE_URL to a hosted provider (MapTiler, Stadia, …) before launch.
 */
export const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Where maps open before there is anything to show: the Klang Valley. */
export const DEFAULT_CENTER: L.LatLngTuple = [3.0733, 101.5185]

/** A point on the map. */
export interface LatLng {
  lat: number
  lng: number
}

/**
 * Turn-by-turn directions to a point. On a phone this opens the maps app,
 * on a computer a new tab; either way the person's own maps take over.
 */
export function directionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
