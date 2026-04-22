const BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `HTTP ${res.status} – ${res.statusText}`)
  }
  return res.json()
}

export const getDevices = () => request('/devices')

export const getEvents = (params = {}) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return request(`/events${qs ? `?${qs}` : ''}`)
}

export const addDeviceAPI = (data) =>
  request('/add-device', { method: 'POST', body: JSON.stringify(data) })

export const toggleNetworkSimulation = (data) =>
  request('/toggle-network-simulation', { method: 'POST', body: JSON.stringify(data) })

// ── Multi-tenant ────────────────────────────────────────────────────────────
export const getProducts = (orgId) =>
  request(`/products${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`)

export const getProductById = (id) => request(`/products/${id}`)

export const getProductDevices = (id) => request(`/products/${id}/devices`)

export const getOrgs = () => request('/orgs')

export const getOrgSummary = (id) => request(`/org/${id}/summary`)

// ── Telemetry ────────────────────────────────────────────────────────────────
/**
 * Fetch downsampled history for a device.
 * @param {string} deviceId
 * @param {string} range  15m | 1h | 6h | 24h | 7d  (default: 1h)
 */
export const getDeviceHistory = (deviceId, range = '1h') =>
  request(`/devices/${encodeURIComponent(deviceId)}/history?range=${range}`)

// ── Alerts ───────────────────────────────────────────────────────────────────
export const getAlerts = (params = {}) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return request(`/alerts${qs ? `?${qs}` : ''}`)
}

export const getAlertStats = () => request('/alerts/stats')

export const acknowledgeAlert = (alertId, acknowledgedBy = 'user') =>
  request(`/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ acknowledgedBy }),
  })

export const resolveAlert = (alertId) =>
  request(`/alerts/${encodeURIComponent(alertId)}/resolve`, { method: 'POST' })

// ── Lifecycle ────────────────────────────────────────────────────────────────
export const getLifecycleHistory = (deviceId) =>
  request(`/devices/${encodeURIComponent(deviceId)}/lifecycle/history`)

export const setLifecycleState = (deviceId, state, reason = '') =>
  request(`/devices/${encodeURIComponent(deviceId)}/lifecycle`, {
    method: 'PATCH',
    body: JSON.stringify({ state, reason }),
  })

// ── Observability ────────────────────────────────────────────────────────────
export const getSystemMetrics = () => request('/metrics')

export const getNetworkStatus = () => request('/network/status')
