'use strict';

const express = require('express');
const cors = require('cors');

const deviceRoutes = require('./routes/deviceRoutes');
const eventRoutes = require('./routes/eventRoutes');
const productRoutes = require('./routes/productRoutes');
const alertRoutes = require('./routes/alertRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Global middleware ──────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SkyTrack', timestamp: new Date().toISOString() });
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api', deviceRoutes);
app.use('/api', eventRoutes);
app.use('/api', productRoutes);
app.use('/api', alertRoutes);
app.use('/api', metricsRoutes);   // /api/network/status
app.use('/',    metricsRoutes);   // /metrics (root)

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist.' });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

module.exports = app;
