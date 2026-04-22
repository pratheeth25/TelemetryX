import { useCallback } from 'react'
import useStore from '../store/useStore'
import { addDeviceAPI } from '../services/api'

/**
 * Exposes device state from the store and the addDevice action with
 * optimistic UI: the device appears immediately, then is reconciled
 * once the server confirms (or rolled back on error).
 */
export function useDevices() {
  const devices = useStore((s) => s.devices)
  const updateDevice = useStore((s) => s.updateDevice)
  const setDevices = useStore((s) => s.setDevices)
  const selectedDeviceId = useStore((s) => s.selectedDeviceId)
  const setSelectedDeviceId = useStore((s) => s.setSelectedDeviceId)

  const selectedDevice =
    devices.find((d) => d.deviceId === selectedDeviceId) || devices[0] || null

  const addDevice = useCallback(
    async ({ deviceId, name, location }) => {
      const tempId = deviceId || `opt-${Date.now()}`
      const optimistic = {
        deviceId: tempId,
        name: name || tempId,
        location,
        temperature: 25,
        batteryLevel: 100,
        status: 'online',
        lastSeen: new Date().toISOString(),
        _optimistic: true,
      }
      // Optimistic insert
      updateDevice(optimistic)

      try {
        const result = await addDeviceAPI({ deviceId, name, location })
        // Replace optimistic entry with real data from server
        updateDevice({ ...result.device, _optimistic: false })
        return result.device
      } catch (err) {
        // Rollback
        setDevices(useStore.getState().devices.filter((d) => d.deviceId !== tempId))
        throw err
      }
    },
    [updateDevice, setDevices]
  )

  return { devices, addDevice, selectedDevice, selectedDeviceId, setSelectedDeviceId }
}
