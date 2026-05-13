# TelemetryX — Smart Home IoT Platform
Testing Ci/CD pipeline

A full-stack, multi-tenant smart home IoT monitoring platform.  
Houses are pre-seeded (H001–H100). The first member to register for a house becomes admin; subsequent members join as viewers. Real-time telemetry is driven by a Markov Chain state machine simulator.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 · Express 4 · Socket.IO 4 |
| Database | MongoDB Atlas (Mongoose 7) |
| Frontend | React 18 · Vite 4 · Tailwind CSS 3 |
| State | Zustand 4 |
| Charts | Recharts 2 |
| Containerisation | Docker · Docker Compose · nginx |

---

## Project Structure

```
TelemetryX/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seeder/
│   │   ├── services/
│   │   ├── simulator/
│   │   └── socket/
│   ├── .env.example
│   ├── Dockerfile
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## Running with Docker (recommended)

### Prerequisites
- Docker ≥ 24
- Docker Compose ≥ 2.20
- A MongoDB Atlas cluster (or any MongoDB 7 instance)

### 1. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at minimum:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/telemetryx?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<another-long-random-string>
CORS_ORIGIN=http://localhost
```

### 2. Build and start

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (nginx) | http://localhost |
| Backend API | http://localhost:5000 |

The frontend nginx container proxies `/api/*` and `/socket.io/*` to the backend, so the browser only ever talks to port 80.

### 3. Stop

```bash
docker compose down
```

---

## Running Locally (without Docker)

### Prerequisites
- Node.js ≥ 20
- A MongoDB Atlas URI or local MongoDB instance

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI and JWT secrets
npm start              # or: npm run dev (nodemon)
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).  
The Vite dev server proxies `/api` and `/socket.io` to `localhost:5000`.

---

## Production Deployment

### Live Deployment

| Service | URL |
|---|---|
| **Frontend** | https://telemetry-f25mvbyqo-pratheethsangari-8638s-projects.vercel.app/ |
| **Backend API** | https://telemetryx-backend.onrender.com/ |

### Deployment Stack

- **Frontend:** Vercel (with SPA routing via `vercel.json`)
- **Backend:** Render (Node.js with automatic PORT assignment)
- **Database:** MongoDB Atlas

### Health Check

```bash
curl https://telemetryx-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok"
}
```

### Environment Configuration

**Render (Backend) env vars:**
```
NODE_ENV=production
CORS_ORIGIN=https://telemetry-f25mvbyqo-pratheethsangari-8638s-projects.vercel.app
MONGO_URI=<your-mongodb-atlas-uri>
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
```

**Vercel (Frontend) env vars:**
```
VITE_API_URL=https://telemetryx-backend.onrender.com/api
VITE_SOCKET_URL=https://telemetryx-backend.onrender.com
```

### Key Production Features

- ✅ Cross-origin cookies with `sameSite: "none"` in production
- ✅ SPA routing fallback to `/index.html`
- ✅ CORS configured for Vercel frontend
- ✅ Health endpoint for uptime monitoring
- ✅ JWT refresh token persistence via HTTP-only cookies

---

## Environment Variables

### `backend/.env`

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | HTTP server port |
| `MONGO_URI` | `mongodb://localhost:27017/telemetryx` | MongoDB connection string |
| `CORS_ORIGIN` | `http://localhost,http://localhost:5173` | Allowed origins (comma-separated) |
| `JWT_ACCESS_SECRET` | dev fallback | Sign access tokens — **change in production** |
| `JWT_REFRESH_SECRET` | dev fallback | Sign refresh tokens — **change in production** |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |
| `NODE_ENV` | — | Set to `production` to suppress stack traces |

### Frontend build args (Docker only)

| ARG | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | API base path (relative → nginx proxies it) |
| `VITE_SOCKET_URL` | `http://localhost` | Socket.IO origin (nginx on port 80) |

Override via `docker compose build --build-arg VITE_SOCKET_URL=https://your.domain`.

---

## RBAC

| Role | Capabilities |
|---|---|
| `admin` | Full access: manage devices, users, house settings |
| `operator` | Toggle devices, acknowledge alerts, view analytics |
| `viewer` | Read-only dashboard and telemetry |

The first member to register for a house is automatically assigned `admin`.

---

## API Reference

### Auth
| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/houses` | List available houses |
| POST | `/api/auth/register` | Register (first = admin, rest = viewer) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token (HTTP-only cookie) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user + memberships |
| PATCH | `/api/auth/me` | Update profile / password |

### Devices
| Method | Path | Description |
|---|---|---|
| GET | `/api/devices` | All devices for current house |
| POST | `/api/devices` | Create device (admin) |
| PATCH | `/api/devices/:id` | Update device (admin/operator) |
| DELETE | `/api/devices/:id` | Delete device (admin) |
| PATCH | `/api/devices/:id/toggle` | Enable/disable device (admin/operator) |
| GET | `/api/devices/:id/history` | Telemetry history |
| GET | `/api/devices/graph` | Connectivity graph data |

### Alerts
| Method | Path | Description |
|---|---|---|
| GET | `/api/alerts` | Latest 50 alerts |
| PATCH | `/api/alerts/:id/acknowledge` | Acknowledge an alert |

### Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/summary` | Device/alert summary (`?range=24h`) |
| GET | `/api/analytics/telemetry` | Aggregated telemetry (`?range=24h`) |
| GET | `/api/analytics/alerts` | Alert breakdown (`?range=24h`) |
| GET | `/api/analytics/uptime` | Device uptime (`?range=24h`) |
| GET | `/api/analytics/export/csv` | Export CSV (operator+) |

### House
| Method | Path | Description |
|---|---|---|
| GET | `/api/house` | Current house info + member count |
| PATCH | `/api/house` | Update house name (admin) |

---

## Simulator

The backend runs a Markov Chain state machine that continuously generates telemetry for all enabled devices. States: `NORMAL → ACTIVE → IDLE → WARNING → CRITICAL → OFFLINE`. Transition matrices are tuned per device type with time-of-day bias and occupancy modelling.
