import { create } from 'zustand'

/** Maximum temperature readings kept per device */
const MAX_HISTORY = 25

const useStore = create((set) => ({
  // ── Socket connection ──────────────────────────────────────
  connected: false,
  setConnected: (connected) => set({ connected }),

  // ── Devices ───────────────────────────────────────────────
  devices: [],
  setDevices: (devices) => set({ devices }),
  updateDevice: (updated) =>
    set((state) => {
      const idx = state.devices.findIndex((d) => d.deviceId === updated.deviceId)
      if (idx === -1) return { devices: [...state.devices, updated] }
      const devices = [...state.devices]
      devices[idx] = { ...devices[idx], ...updated }
      return { devices }
    }),

  // ── Selected device (for chart + map highlight) ───────────
  selectedDeviceId: null,
  setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),

  // ── Temperature history  { [deviceId]: [{time, temp}] } ───
  temperatureHistory: {},
  pushTempReading: (deviceId, temperature) =>
    set((state) => {
      const prev = state.temperatureHistory[deviceId] || []
      const entry = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temp: parseFloat(temperature.toFixed(2)),
      }
      const next = [...prev, entry].slice(-MAX_HISTORY)
      return { temperatureHistory: { ...state.temperatureHistory, [deviceId]: next } }
    }),

  // ── Events ────────────────────────────────────────────────
  events: [],
  setEvents: (events) => set({ events }),
  addEvent: (event) =>
    set((state) => ({ events: [event, ...state.events].slice(0, 300) })),

  // ── Event filters ─────────────────────────────────────────
  eventFilters: { severity: '', type: '' },
  setEventFilter: (key, value) =>
    set((state) => ({ eventFilters: { ...state.eventFilters, [key]: value } })),

  // ── Network simulation state ──────────────────────────────
  networkState: { enabled: false, delayMs: 500, packetLossRate: 0.1 },
  setNetworkState: (ns) => set({ networkState: ns }),

  // ── Products ──────────────────────────────────────────────
  products: [],
  setProducts: (products) => set({ products }),

  // ── Organisations ─────────────────────────────────────────
  orgs: [],
  setOrgs: (orgs) => set({ orgs }),

  // ── Active org filter (null = all) ────────────────────────
  activeOrgId: null,
  setActiveOrgId: (id) => set({ activeOrgId: id }),

  // ── Active product drill-down (null = product grid) ───────
  activeProductId: null,
  setActiveProductId: (id) => set({ activeProductId: id }),

  // ── UI ────────────────────────────────────────────────────
  darkMode: true,
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode
      document.documentElement.classList.toggle('dark', next)
      return { darkMode: next }
    }),

  // ── Predictions  { [deviceId]: { failureRisk, predictedFailureTime, reasons, timestamp } }
  predictions: {},
  upsertPrediction: (payload) =>
    set((state) => ({
      predictions: {
        ...state.predictions,
        [payload.deviceId]: {
          failureRisk:          payload.failureRisk,
          predictedFailureTime: payload.predictedFailureTime,
          reasons:              payload.reasons || [],
          timestamp:            payload.timestamp,
        },
      },
    })),

  // ── Alerts  [{ alertId, deviceId, ruleId, severity, state, message, triggeredAt, ... }]
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  upsertAlert: (alert) =>
    set((state) => {
      const idx = state.alerts.findIndex((a) => a.alertId === alert.alertId)
      if (idx === -1) return { alerts: [alert, ...state.alerts].slice(0, 500) }
      const next = [...state.alerts]
      next[idx] = { ...next[idx], ...alert }
      return { alerts: next }
    }),
  updateAlertState: (alertId, patch) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.alertId === alertId ? { ...a, ...patch } : a)),
    })),

  // ── Lifecycle history  { [deviceId]: [{ fromState, toState, reason, source, timestamp }] }
  lifecycleHistories: {},
  setLifecycleHistory: (deviceId, history) =>
    set((state) => ({ lifecycleHistories: { ...state.lifecycleHistories, [deviceId]: history } })),
  prependLifecycleEvent: (event) =>
    set((state) => {
      const prev = state.lifecycleHistories[event.deviceId] || []
      return {
        lifecycleHistories: {
          ...state.lifecycleHistories,
          [event.deviceId]: [event, ...prev].slice(0, 200),
        },
      }
    }),

  // ── System metrics (polled from /metrics) ─────────────────────────────────
  systemMetrics: null,
  setSystemMetrics: (m) => set({ systemMetrics: m }),

  // ── Network metrics (from /api/network/status) ────────────────────────────
  networkMetrics: null,
  setNetworkMetrics: (m) => set({ networkMetrics: m }),
}))

export default useStore
