'use strict';

require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const deviceSimulationService = require('./src/services/deviceSimulationService');

const PORT = process.env.PORT || 3000;

// ── HTTP server ────────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.IO ──────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to services/controllers via app
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send current device snapshot to the newly connected client
  const snapshot = deviceSimulationService.getAllDevices();
  socket.emit('devices:snapshot', snapshot);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ── Bootstrap ──────────────────────────────────────────────────────────────────
(async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`[Server] SkyTrack running on http://localhost:${PORT}`);
    // Start device simulation AFTER the server is ready
    deviceSimulationService.start(io);
  });
})();
