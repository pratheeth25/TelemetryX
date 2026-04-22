import { useState, useEffect, useCallback, useRef } from 'react'
import { getDeviceHistory } from '../services/api'
import useStore from '../store/useStore'

const VALID_RANGES = ['15m', '1h', '6h', '24h', '7d']

/**
 * useTelemetry(deviceId, initialRange)
 *
 * Lazily loads downsampled telemetry history from the REST API.
 * Automatically merges in live Socket.IO readings from the Zustand
 * temperatureHistory slice so the chart stays fresh between API fetches.
 *
 * Returns:
 *   history      – array of { time, temp, battery, count? }
 *   range        – current active range string
 *   setRange     – change range (triggers a fresh load)
 *   loading      – true while fetching
 *   error        – Error | null
 *   refresh      – manually re-fetch
 *   VALID_RANGES – exported constant for building UI controls
 */
export function useTelemetry(deviceId, initialRange = '1h') {
  const [range, setRangeState] = useState(initialRange)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  // Track the in-flight request so we can ignore stale responses
  const requestIdRef = useRef(0)

  // Live readings from Socket.IO (real-time tail)
  const liveHistory = useStore((s) => s.temperatureHistory[deviceId] || [])

  const fetchHistory = useCallback(async (id, r) => {
    if (!id) { setHistory([]); return }
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const data = await getDeviceHistory(id, r)
      // Ignore if a newer request was fired in the meantime
      if (reqId !== requestIdRef.current) return
      setHistory(data.history || [])
    } catch (err) {
      if (reqId !== requestIdRef.current) return
      setError(err)
      setHistory([])
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }, [])

  // Load whenever deviceId or range changes
  useEffect(() => {
    fetchHistory(deviceId, range)
  }, [deviceId, range, fetchHistory])

  // Merge live Socket.IO tail into persisted history.
  // The live tail is at most MAX_HISTORY (25) readings; we append any that
  // are newer than the last persisted bucket to avoid duplicates.
  const mergedHistory = (() => {
    if (!liveHistory.length) return history

    // If we have no API data yet, fall back to live-only
    if (!history.length) return liveHistory

    // Append live points that are strictly after the last API bucket
    return [...history, ...liveHistory.slice(-5)]
  })()

  const setRange = useCallback((r) => {
    if (VALID_RANGES.includes(r)) setRangeState(r)
  }, [])

  const refresh = useCallback(() => fetchHistory(deviceId, range), [deviceId, range, fetchHistory])

  return { history: mergedHistory, range, setRange, loading, error, refresh, VALID_RANGES }
}
