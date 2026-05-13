const Device = require("../models/Device");
const { saveTelemetry, checkAlerts } = require("../services/telemetryService");

const STATES = ["NORMAL", "ACTIVE", "IDLE", "WARNING", "CRITICAL", "OFFLINE"];
const S = Object.fromEntries(STATES.map((s, i) => [s, i]));

const BASE_MATRIX = [
  [0.60,  0.15,  0.15,  0.07,  0.02,  0.01],
  [0.25,  0.45,  0.05,  0.15,  0.08,  0.02],
  [0.30,  0.05,  0.50,  0.10,  0.03,  0.02],
  [0.15,  0.10,  0.05,  0.45,  0.20,  0.05],
  [0.05,  0.05,  0.02,  0.30,  0.40,  0.18],
  [0.10,  0.05,  0.15,  0.15,  0.25,  0.30],
];

const TYPE_MATRICES = {
  smart_lights: [
    [0.40, 0.40, 0.10, 0.06, 0.02, 0.02],
    [0.30, 0.50, 0.10, 0.07, 0.02, 0.01],
    [0.30, 0.20, 0.40, 0.06, 0.02, 0.02],
    [0.15, 0.10, 0.05, 0.45, 0.20, 0.05],
    [0.05, 0.05, 0.02, 0.30, 0.40, 0.18],
    [0.20, 0.10, 0.20, 0.12, 0.18, 0.20],
  ],
  smart_camera: [
    [0.55, 0.25, 0.08, 0.07, 0.03, 0.02],
    [0.20, 0.60, 0.02, 0.10, 0.05, 0.03],
    [0.25, 0.05, 0.55, 0.10, 0.03, 0.02],
    [0.10, 0.10, 0.05, 0.50, 0.20, 0.05],
    [0.05, 0.05, 0.02, 0.28, 0.42, 0.18],
    [0.06, 0.04, 0.10, 0.15, 0.25, 0.40],
  ],
  sensor_motion: [
    [0.50, 0.20, 0.22, 0.05, 0.01, 0.02],
    [0.55, 0.20, 0.15, 0.06, 0.03, 0.01],
    [0.35, 0.08, 0.48, 0.06, 0.01, 0.02],
    [0.15, 0.10, 0.05, 0.45, 0.20, 0.05],
    [0.05, 0.05, 0.02, 0.30, 0.40, 0.18],
    [0.18, 0.05, 0.22, 0.12, 0.18, 0.25],
  ],
  smart_refrigerator: [
    [0.65, 0.10, 0.10, 0.08, 0.05, 0.02],
    [0.35, 0.40, 0.10, 0.10, 0.04, 0.01],
    [0.40, 0.05, 0.42, 0.08, 0.03, 0.02],
    [0.10, 0.08, 0.05, 0.48, 0.24, 0.05],
    [0.03, 0.03, 0.02, 0.27, 0.48, 0.17],
    [0.08, 0.03, 0.10, 0.18, 0.28, 0.33],
  ],
  smart_door_lock: [
    [0.65, 0.10, 0.15, 0.06, 0.02, 0.02],
    [0.50, 0.25, 0.12, 0.08, 0.03, 0.02],
    [0.30, 0.05, 0.52, 0.08, 0.03, 0.02],
    [0.15, 0.05, 0.05, 0.48, 0.22, 0.05],
    [0.05, 0.03, 0.02, 0.28, 0.44, 0.18],
    [0.12, 0.05, 0.18, 0.15, 0.22, 0.28],
  ],
};

function getMatrix(type) {
  return TYPE_MATRICES[type] || BASE_MATRIX;
}

const STATE_PROFILES = {
  NORMAL:   { temp: [20, 40], battery: [60, 95], signal: [-65, -45], latency: [8,   50],  packetLoss: [0,   3]  },
  ACTIVE:   { temp: [35, 60], battery: [40, 75], signal: [-70, -45], latency: [15,  80],  packetLoss: [0,   5]  },
  IDLE:     { temp: [18, 30], battery: [70, 99], signal: [-60, -40], latency: [5,   30],  packetLoss: [0,   2]  },
  WARNING:  { temp: [55, 75], battery: [20, 50], signal: [-82, -60], latency: [60,  160], packetLoss: [5,   15] },
  CRITICAL: { temp: [72, 92], battery: [5,  25], signal: [-90, -76], latency: [130, 290], packetLoss: [14,  25] },
  OFFLINE:  { temp: [0,   0], battery: [0,   0], signal: [-99, -99], latency: [999, 999], packetLoss: [100, 100] },
};

const TYPE_TELEMETRY_MOD = {
  smart_refrigerator: { tempOffset: -18 },
  sensor_motion:      { batteryOffset: -8 },
  smart_camera:       { latencyOffset: +15 },
  sensor_smoke:       { batteryOffset: -5 },
  sensor_water:       { batteryOffset: -5 },
};

const registry = new Map();

function getDeviceState(deviceId) {
  if (!registry.has(deviceId)) {
    registry.set(deviceId, {
      currentState:  "NORMAL",
      previousState: "NORMAL",
      lastTelemetry: null,
      ticks:         0,
    });
  }
  return registry.get(deviceId);
}

function transitionState(ds, deviceType, timeModifier) {
  const matrix = getMatrix(deviceType);
  const row    = S[ds.currentState];
  const probs  = [...matrix[row]];

  if (timeModifier > 0) {
    probs[S.ACTIVE] = Math.min(probs[S.ACTIVE] * 1.35, 0.65);
    probs[S.IDLE]   = Math.max(probs[S.IDLE]   * 0.65, 0.01);
  } else {
    probs[S.IDLE]   = Math.min(probs[S.IDLE]   * 1.45, 0.72);
    probs[S.ACTIVE] = Math.max(probs[S.ACTIVE] * 0.45, 0.01);
  }

  const total = probs.reduce((a, b) => a + b, 0);
  const norm  = probs.map((p) => p / total);

  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < norm.length; i++) {
    cumulative += norm[i];
    if (r <= cumulative) {
      ds.previousState = ds.currentState;
      ds.currentState  = STATES[i];
      ds.ticks++;
      return STATES[i];
    }
  }
  return ds.currentState;
}

function applyDrift(oldVal, min, max, rate = 0.22) {
  const target = min + Math.random() * (max - min);
  if (oldVal === null || oldVal === undefined) return target;
  return oldVal + (target - oldVal) * rate;
}

function applyCorrelations(t) {
  if (t.signalStrength < -80) {
    t.latency *= 1.2 + Math.random() * 0.25;
  }
  if (t.latency > 150) {
    t.packetLoss += 3 + Math.random() * 4;
  }
  t._tempCritical = t.temperature > 80;
  return t;
}

function calculateOfflineProbability(t, state) {
  let p = 0.008;
  if (state === "CRITICAL") p += 0.22;
  if (state === "WARNING")  p += 0.06;
  if (t.battery        < 10) p += 0.14;
  if (t.signalStrength < -86) p += 0.10;
  if (t.packetLoss     > 20) p += 0.09;
  if (t._tempCritical)       p += 0.06;
  return Math.min(p, 0.55);
}

function generateTelemetry(device, ds, occupied) {
  const state   = ds.currentState;
  const profile = STATE_PROFILES[state];
  const last    = ds.lastTelemetry;
  const mod     = TYPE_TELEMETRY_MOD[device.type] || {};

  if (state === "OFFLINE") {
    return { _offline: true };
  }

  const tOff = mod.tempOffset    || 0;
  const bOff = mod.batteryOffset || 0;
  const lOff = mod.latencyOffset || 0;

  const raw = {
    temperature:    applyDrift(last?.temperature,    profile.temp[0]        + tOff, profile.temp[1]        + tOff),
    battery:        applyDrift(last?.battery,        profile.battery[0]     + bOff, profile.battery[1]     + bOff),
    signalStrength: applyDrift(last?.signalStrength, profile.signal[0],             profile.signal[1]),
    latency:        applyDrift(last?.latency,        profile.latency[0]     + lOff, profile.latency[1]     + lOff),
    packetLoss:     applyDrift(last?.packetLoss,     profile.packetLoss[0],         profile.packetLoss[1]),
  };

  if (occupied) {
    if (["smart_lights", "smart_tv", "smart_speaker"].includes(device.type)) {
      raw.battery   = Math.max(0, raw.battery - 4);
      raw.latency   = Math.min(999, raw.latency * 1.1);
    }
    if (device.type === "sensor_motion") {
      raw.packetLoss = Math.max(0, raw.packetLoss - 1);
    }
  }

  applyCorrelations(raw);

  const goOffline = Math.random() < calculateOfflineProbability(raw, state);

  return {
    temperature:    parseFloat(Math.max(0,   raw.temperature).toFixed(1)),
    battery:        parseFloat(Math.max(0,   Math.min(100, raw.battery)).toFixed(1)),
    signalStrength: parseFloat(Math.max(-99, Math.min(-20, raw.signalStrength)).toFixed(1)),
    latency:        parseFloat(Math.max(1,   raw.latency).toFixed(0)),
    packetLoss:     parseFloat(Math.max(0,   Math.min(100, raw.packetLoss)).toFixed(1)),
    status:         goOffline ? "offline" : "online",
  };
}

function getTimeModifier() {
  const h = new Date().getHours();
  return (h >= 7 && h < 22) ? 1 : -1;
}

const houseOccupancy = new Map();

function isOccupied(houseId) {
  const timeMod = getTimeModifier();
  const target  = timeMod > 0 ? 0.65 : 0.15;
  const current = houseOccupancy.get(houseId) ?? target;
  const next    = current + (target - current) * 0.08 + (Math.random() - 0.5) * 0.04;
  houseOccupancy.set(houseId, Math.min(1, Math.max(0, next)));
  return Math.random() < next;
}

async function emitTelemetry(io, device, telemetry) {
  await saveTelemetry(device.deviceId, telemetry, device.houseId);
  const newAlerts = await checkAlerts(device, telemetry);

  io.to(device.houseId).emit("telemetry", {
    deviceId:  device.deviceId,
    houseId:   device.houseId,
    name:      device.name,
    location:  device.location,
    type:      device.type,
    enabled:   device.enabled,
    ...telemetry,
    timestamp: new Date().toISOString(),
  });

  if (newAlerts.length > 0) {
    io.to(device.houseId).emit("newAlert", newAlerts);
  }
}

async function startSimulator(io) {
  const removed = await Device.deleteMany({ registeredBy: "system" });
  if (removed.deletedCount > 0) {
    console.log(`Simulator: removed ${removed.deletedCount} old demo devices`);
  }
  console.log("Simulator: ready — Markov Chain engine active (4 s interval)");

  setInterval(async () => {
    try {
      const devices = await Device.find({ enabled: true }).lean();
      const timeMod = getTimeModifier();

      for (const device of devices) {
        const ds       = getDeviceState(device.deviceId);
        const occupied = isOccupied(device.houseId);

        transitionState(ds, device.type, timeMod);

        const telemetry = generateTelemetry(device, ds, occupied);

        if (telemetry._offline) {
          const frozen = ds.lastTelemetry;
          await emitTelemetry(io, device, {
            temperature:    frozen?.temperature    ?? 0,
            battery:        frozen?.battery        ?? 0,
            signalStrength: -99,
            latency:        999,
            packetLoss:     100,
            status:         "offline",
          });
          continue;
        }

        ds.lastTelemetry = telemetry;
        await emitTelemetry(io, device, telemetry);
      }
    } catch (err) {
      console.error("Simulator tick error:", err.message);
    }
  }, 4000);
}

module.exports = { startSimulator };
