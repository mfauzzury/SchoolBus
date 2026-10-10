import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useTranslation } from 'react-i18next'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BusFront, LocateFixed } from 'lucide-react'
import type { SignalState } from '@/api/tracking'
import { cn } from '@/lib/utils'

/**
 * OpenStreetMap's public tile servers forbid production-scale traffic —
 * set VITE_MAP_TILE_URL to a hosted provider (MapTiler, Stadia, …) before launch.
 */
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const DEFAULT_CENTER: L.LatLngTuple = [3.0733, 101.5185] // Shah Alam
const FOLLOW_ZOOM = 15

const busSvg = renderToStaticMarkup(<BusFront size={18} strokeWidth={2.25} />)

export interface BusMapMarker {
  id: number
  lat: number
  lng: number
  heading: number | null
  label: string
  signal: SignalState
}

function busIcon(marker: BusMapMarker, selected: boolean): L.DivIcon {
  const heading =
    marker.heading != null && marker.signal === 'live'
      ? `<span class="bus-marker-heading" style="transform: rotate(${Math.round(marker.heading)}deg)"></span>`
      : ''
  return L.divIcon({
    className: 'bus-marker-icon',
    html: `<div class="bus-marker bus-marker--${marker.signal}${selected ? ' bus-marker--selected' : ''}">
      ${heading}
      <span class="bus-marker-body">${busSvg}</span>
      <span class="bus-marker-label">${marker.label}</span>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function BusMarker({
  marker,
  selected,
  onSelect,
}: {
  marker: BusMapMarker
  selected: boolean
  onSelect?: (id: number) => void
}) {
  const roundedHeading = marker.heading == null ? null : Math.round(marker.heading / 5) * 5
  const icon = useMemo(
    () => busIcon({ ...marker, heading: roundedHeading }, selected),
    // Rebuild the DOM icon only when its look changes, not on every position tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundedHeading, marker.signal, marker.label, selected],
  )
  return (
    <Marker
      position={[marker.lat, marker.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={onSelect ? { click: () => onSelect(marker.id) } : undefined}
    />
  )
}

/**
 * Keeps the camera on the tracked bus. Following pauses as soon as the user
 * drags the map and resumes via the recenter button or a new selection.
 */
function Camera({
  markers,
  selectedId,
  follow,
}: {
  markers: BusMapMarker[]
  selectedId: number | null
  follow: boolean
}) {
  const { t } = useTranslation()
  const map = useMap()
  const [userMoved, setUserMoved] = useState(false)
  const fitted = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useMapEvents({ dragstart: () => setUserMoved(true) })

  const target =
    selectedId != null
      ? markers.find((m) => m.id === selectedId)
      : follow && markers.length === 1
        ? markers[0]
        : undefined

  useEffect(() => {
    if (fitted.current || markers.length === 0) return
    fitted.current = true
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], FOLLOW_ZOOM)
    } else {
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), { padding: [48, 48] })
    }
  }, [map, markers])

  useEffect(() => {
    if (selectedId == null || !target) return
    setUserMoved(false)
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), FOLLOW_ZOOM), { duration: 0.6 })
    // Only on selection change — per-tick following is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (target && !userMoved) map.panTo([target.lat, target.lng], { animate: true })
  }, [map, target?.lat, target?.lng, userMoved]) // eslint-disable-line react-hooks/exhaustive-deps

  // Leaflet listens for native mousedown on the container, which fires before
  // React's delegated handlers — so propagation must be stopped natively.
  useEffect(() => {
    if (buttonRef.current) L.DomEvent.disableClickPropagation(buttonRef.current)
  })

  if (!target || !userMoved) return null

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => setUserMoved(false)}
      className="absolute right-3 bottom-3 z-[1000] flex items-center gap-1.5 rounded-full border bg-background px-3 py-2 text-xs font-medium shadow-md hover:bg-muted"
    >
      <LocateFixed className="size-4" />
      {t('tracking.recenter')}
    </button>
  )
}

export function BusMap({
  markers,
  selectedId = null,
  onSelect,
  follow = true,
  className,
}: {
  markers: BusMapMarker[]
  selectedId?: number | null
  onSelect?: (id: number) => void
  follow?: boolean
  className?: string
}) {
  return (
    // `isolate` contains Leaflet's pane z-indexes (400–1000) so the map
    // can't paint over the app's fixed bottom nav or dialogs.
    <div className={cn('isolate overflow-hidden', className)}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        zoomControl={false}
        className="size-full"
        attributionControl
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {markers.map((marker) => (
          <BusMarker
            key={marker.id}
            marker={marker}
            selected={marker.id === selectedId}
            onSelect={onSelect}
          />
        ))}
        <Camera markers={markers} selectedId={selectedId} follow={follow} />
      </MapContainer>
    </div>
  )
}
