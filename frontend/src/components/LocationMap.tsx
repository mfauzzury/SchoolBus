import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { DEFAULT_CENTER, TILE_ATTRIBUTION, TILE_URL, type LatLng } from '@/lib/map'
import { cn } from '@/lib/utils'

const PIN_ZOOM = 16
const START_ZOOM = 11

// A drawn pin, so nothing depends on Leaflet's default marker image files.
const pinIcon = L.divIcon({
  className: '',
  html: renderToStaticMarkup(<MapPin size={36} strokeWidth={1.75} color="#b91c1c" fill="#fecaca" />),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})

/** About 10 cm: more digits only make the numbers harder to read. */
function rounded(point: LatLng): LatLng {
  return { lat: Math.round(point.lat * 1e6) / 1e6, lng: Math.round(point.lng * 1e6) / 1e6 }
}

/** Clicking the map puts the pin there. */
function ClickToPlace({ onChange }: { onChange: (point: LatLng) => void }) {
  useMapEvents({ click: (event) => onChange(rounded(event.latlng)) })
  return null
}

/** When a saved pin arrives after the map has already opened, go to it once. */
function GoToFirstPin({ value }: { value: LatLng | null }) {
  const map = useMap()
  const went = useRef(value !== null)
  useEffect(() => {
    if (value && !went.current) {
      went.current = true
      map.setView([value.lat, value.lng], PIN_ZOOM)
    }
  }, [map, value])
  return null
}

/**
 * A map with one pin on OpenStreetMap. With `onChange` it is editable: click
 * to drop the pin, drag it to adjust. Without, it only shows where the pin is.
 */
export function LocationMap({
  value,
  onChange,
  className,
}: {
  value: LatLng | null
  onChange?: (point: LatLng) => void
  className?: string
}) {
  return (
    // `isolate` keeps Leaflet's pane z-indexes from painting over dialogs and menus.
    <div className={cn('isolate overflow-hidden', className)}>
      <MapContainer
        center={value ? [value.lat, value.lng] : DEFAULT_CENTER}
        zoom={value ? PIN_ZOOM : START_ZOOM}
        scrollWheelZoom={Boolean(onChange)}
        className="size-full"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={pinIcon}
            draggable={Boolean(onChange)}
            eventHandlers={
              onChange
                ? { dragend: (event) => onChange(rounded((event.target as L.Marker).getLatLng())) }
                : undefined
            }
          />
        )}
        {onChange && <ClickToPlace onChange={onChange} />}
        <GoToFirstPin value={value} />
      </MapContainer>
    </div>
  )
}
