import { useState } from 'react'
import DeviceCard from './DeviceCard'
import AddDeviceModal from './AddDeviceModal'
import { useDevices } from '../hooks/useDevices'

export default function DeviceGrid() {
  const { devices } = useDevices()
  const [showModal, setShowModal] = useState(false)

  // Worst health first so actionable devices surface at the top
  const sorted = [...devices].sort((a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100))

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-base">
          Devices
          <span className="ml-2 text-sm text-gray-500 font-normal">({devices.length})</span>
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-lg transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Device
        </button>
      </div>

      {/* Grid */}
      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <svg className="w-14 h-14 mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          <p className="font-medium">No devices connected</p>
          <p className="text-sm mt-1">Start the backend to see live data</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {sorted.map((device) => (
            <DeviceCard key={device.deviceId} device={device} />
          ))}
        </div>
      )}

      {showModal && <AddDeviceModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
