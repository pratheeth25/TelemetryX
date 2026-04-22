import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { useDevices } from '../hooks/useDevices'

const STATUS_COLOR = {
  online:   '#10b981',
  warning:  '#f59e0b',
  critical: '#ef4444',
  offline:  '#6b7280',
}

/** Auto-fit the map bounds whenever the device list changes size */
function AutoFit({ devices }) {
  const map = useMap()
  useEffect(() => {
    const coords = devices
      .filter((d) => d.location?.lat != null && d.location?.lng != null)
      .map((d) => [d.location.lat, d.location.lng])
    if (coords.length > 0) {
      try {
        map.fitBounds(coords, { padding: [50, 50], maxZoom: 8, animate: true })
      } catch { /* ignore invalid bounds */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices.length])
  return null
}

export default function MapView() {
  const { devices, selectedDeviceId, setSelectedDeviceId } = useDevices()
  const valid = devices.filter(
    (d) => d.location && typeof d.location.lat === 'number' && typeof d.location.lng === 'number'
  )

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-700">
        <h2 className="text-white font-semibold">Device Map</h2>
        <span className="text-xs text-gray-500">{valid.length} plotted</span>
      </div>

      {/* Map */}
      <div className="h-64 relative">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          zoomControl
          attributionControl
        >
          {/* Dark tile layer from CartoDB */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
          />

          {valid.map((device) => {
            const color = STATUS_COLOR[device.status] || STATUS_COLOR.offline
            const isSelected = device.deviceId === selectedDeviceId
            return (
              <CircleMarker
                key={device.deviceId}
                center={[device.location.lat, device.location.lng]}
                radius={isSelected ? 12 : 8}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: isSelected ? 3 : 1.5,
                }}
                eventHandlers={{ click: () => setSelectedDeviceId(device.deviceId) }}
              >
                <Popup>
                  <div className="text-sm leading-relaxed">
                    <p className="font-bold mb-1">{device.name || device.deviceId}</p>
                    <p>🌡 {device.temperature?.toFixed(1)}°C</p>
                    <p>🔋 {device.batteryLevel?.toFixed(0)}%</p>
                    <p>● {device.status}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}

          <AutoFit devices={valid} />
        </MapContainer>
      </div>
    </div>
  )
}
