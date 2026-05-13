import { create } from "zustand";

const useStore = create((set, get) => ({
  devices: {},

  alerts: [],

  history: {},

  updateDevice: (data) =>
    set((state) => ({
      devices: { ...state.devices, [data.deviceId]: data },
    })),

  setDevices: (deviceArray) => {
    const map = {};
    deviceArray.forEach((d) => {
      map[d.deviceId] = {
        deviceId: d.deviceId,
        name: d.name,
        location: d.location,
        type: d.type,
        status: d.status,
        enabled: d.enabled ?? true,
        ...d.telemetry,
      };
    });
    set({ devices: map });
  },

  setAlerts: (alerts) => set({ alerts }),

  addAlerts: (newAlerts) =>
    set((state) => ({ alerts: [...newAlerts, ...state.alerts].slice(0, 100) })),

  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a._id === id ? { ...a, acknowledged: true } : a
      ),
    })),

  setHistory: (deviceId, data) =>
    set((state) => ({ history: { ...state.history, [deviceId]: data } })),

  setDeviceEnabled: (deviceId, enabled, status) =>
    set((state) => ({
      devices: {
        ...state.devices,
        [deviceId]: state.devices[deviceId]
          ? { ...state.devices[deviceId], enabled, status: status ?? (enabled ? "online" : "offline") }
          : state.devices[deviceId],
      },
    })),

  addDevice: (device) =>
    set((state) => ({
      devices: {
        ...state.devices,
        [device.deviceId]: {
          deviceId: device.deviceId,
          name:     device.name,
          location: device.location,
          type:     device.type,
          status:   device.status,
          enabled:  device.enabled ?? true,
          ...(device.telemetry || {}),
        },
      },
    })),

  removeDevice: (deviceId) =>
    set((state) => {
      const { [deviceId]: _, ...rest } = state.devices;
      return { devices: rest };
    }),

  appendHistory: (deviceId, reading) =>
    set((state) => {
      const prev = state.history[deviceId] || [];
      const next = [...prev, reading].slice(-60);
      return { history: { ...state.history, [deviceId]: next } };
    }),
}));

export default useStore;
