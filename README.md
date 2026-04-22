# SkyTrack — IoT Monitoring Platform

A full-stack, multi-tenant IoT product monitoring platform built as a portfolio project.
Simulates 15 pre-configured devices across 3 organisations and 5 products with real-time
telemetry, anomaly detection, predictive failure, alerting, device lifecycle management,
satellite-link network simulation, and system observability.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 · Express 4 · Socket.IO 4 |
| Database | MongoDB 7 · Mongoose 8 |
| Frontend | React 18 · Vite 5 · Tailwind CSS 3 |
| State | Zustand 4 |
| Charts | Recharts |
| Map | Leaflet + react-leaflet |

---

## Project Structure

```
lls/
├── backend/          Express API + Socket.IO server
│   ├── src/
│   │   ├── config/       Seed data, thresholds, DB connection
│   │   ├── controllers/  Route handlers
│   │   ├── events/       Internal event bus
│   │   ├── middleware/   Error handler
│   │   ├── models/       Mongoose schemas
│   │   ├── routes/       Express routers
│   │   ├── services/     Business logic
│   │   └── tests/        Unit tests
│   └── server.js         Entry point
└── frontend/         React + Vite SPA
    └── src/
        ├── components/   UI components
        ├── hooks/        Custom hooks
        ├── services/     API client
        └── store/        Zustand store
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- MongoDB running locally on `mongodb://localhost:27017`

### Backend

```bash
cd backend
npm install
cp .env.example .env   # configure MONGO_URI, PORT, etc.
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

### backend/.env

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `MONGO_URI` | `mongodb://localhost:27017/skytrack` | MongoDB connection string |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `THRESHOLD_TEMP_HIGH` | `80` | Warning temperature (°C) |
| `THRESHOLD_TEMP_CRITICAL` | `95` | Critical temperature (°C) |
| `THRESHOLD_BATTERY_LOW` | `20` | Warning battery (%) |
| `THRESHOLD_BATTERY_CRITICAL` | `10` | Critical battery (%) |
| `THRESHOLD_OFFLINE_MS` | `15000` | Offline timeout (ms) |
| `NET_DELAY_MIN_MS` | `2000` | Satellite min latency (ms) |
| `NET_DELAY_MAX_MS` | `10000` | Satellite max latency (ms) |
| `NET_PACKET_LOSS` | `0.05` | Baseline packet loss rate |
| `NET_BURST_LOSS` | `0.15` | Burst outage loss rate |
| `NET_BURST_DURATION_MS` | `4000` | Burst duration (ms) |
| `NET_BURST_INTERVAL_MS` | `30000` | Burst interval (ms) |
| `TELEMETRY_TTL_SECONDS` | `604800` | Telemetry TTL (7 days) |
| `LIFECYCLE_FAILED_STREAK` | `5` | Critical ticks before FAILED |

---

## API Reference

### Devices
| Method | Path | Description |
|---|---|---|
| GET | `/api/devices` | All device states |
| POST | `/api/add-device` | Register a device |
| GET | `/api/devices/:id/history` | Downsampled telemetry (`?range=1h`) |
| PATCH | `/api/devices/:id/lifecycle` | Manual lifecycle override |
| GET | `/api/devices/:id/lifecycle/history` | Lifecycle audit log |

### Alerts
| Method | Path | Description |
|---|---|---|
| GET | `/api/alerts` | List alerts (`?state=open`) |
| GET | `/api/alerts/stats` | Count by severity / state |
| POST | `/api/alerts/:id/acknowledge` | Acknowledge an alert |
| POST | `/api/alerts/:id/resolve` | Resolve an alert |

### Network Simulation
| Method | Path | Description |
|---|---|---|
| POST | `/api/toggle-network-simulation` | Toggle + configure |
| GET | `/api/network/status` | Current status + metrics |

### Observability
| Method | Path | Description |
|---|---|---|
| GET | `/metrics` | System metrics (events/s, anomalies/min, heap) |

### Products & Orgs
| Method | Path | Description |
|---|---|---|
| GET | `/api/orgs` | All organisations |
| GET | `/api/products` | All products |
| GET | `/api/products/:id/devices` | Devices for a product |

---

## Features

- **Real-time simulation** — 15 devices tick every 2–5 s with jittered sensor readings
- **4-factor health scoring** — temperature 35%, battery 30%, latency 20%, anomaly history 15%
- **Predictive failure** — 3-signal heuristics (slope, drain rate, missed heartbeats)
- **Alerting system** — deduplication, auto-resolve, acknowledge, 5 built-in rules
- **Device lifecycle** — ACTIVE / INACTIVE / MAINTENANCE / FAILED with audit timeline
- **Satellite network simulation** — variable latency, burst outages, bandwidth cap, message batching
- **System observability** — events/sec, anomalies/min, heap usage at `/metrics`
- **Multi-tenant** — 3 orgs, 5 products, product drill-down view
- **Time-series telemetry** — MongoDB TTL + downsampling, range picker (15m → 7d)

---

## Running Tests

```bash
cd backend
node src/tests/healthScore.test.js   # 20 tests
node src/tests/prediction.test.js    # 11 tests
```

---

## Supported Devices (Portfolio)

This platform currently supports **15 pre-configured devices** for demonstration purposes.

| Org | Product | Devices |
|---|---|---|
| Nexus Technologies | NX-7 Smart Phone | nx-phone-001 → 003 |
| Nexus Technologies | NX Pro Laptop | nx-laptop-001 → 003 |
| Meridian Systems | Meridian Fit Watch | md-watch-001 → 003 |
| Meridian Systems | Meridian MeshRouter | md-router-001 → 003 |
| Vertex Innovations | Vertex EnviroSensor | vx-sensor-001 → 003 |

